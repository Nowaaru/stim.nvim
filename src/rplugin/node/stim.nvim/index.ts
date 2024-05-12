import { NvimPlugin, Neovim } from "neovim";
import type Buttplug from "buttplug";

const {
  ButtplugClient,
  ActuatorType,
  ScalarSubcommand,
  ButtplugError,
  ButtplugNodeWebsocketClientConnector,
} = require("buttplug") as typeof Buttplug;

namespace Sequence {
  type ExecuteParams = {
    on_number: (e: number) => void | Promise<void>;
    on_array: (e: number[]) => void | Promise<void>;
    on_end?: () => void | Promise<void>;
  };

  export class Sequence {
    private readonly sequence: Array<number | number[]> = new Array();
    private plugin?: NvimPlugin["nvim"];

    public Wait(time_ms: number) {
      this.Insert(time_ms);
    }

    public Stop(): void {
      this.sequence.push([]);
    }

    public Insert(items: number[] | number, stepInterval?: number): void {
      if (Array.isArray(items)) {
        this.plugin?.outWriteLine(`pushed: ${items.join(", ")}, ${items[0]}`);

        this.sequence.push(
          items.map((e) => (stepInterval ? e - (e % stepInterval) : e)),
        );

        return;
      } else this.sequence.push(items);

      this.plugin?.outWriteLine(`added: Wait(${items})`);
    }

    public SetDebugPlugin(plugin: Neovim | null) {
      this.plugin = plugin ?? undefined;
      return this;
    }

    public Print() {
      for (const v of this.sequence.values())
        this.plugin?.outWriteLine(
          Array.isArray(v) ? `[${v.join(", ")}]` : `Wait(${v.toString(10)})`,
        );
    }

    public async Execute({
      on_number,
      on_array,
      on_end,
    }: ExecuteParams): Promise<void> {
      return new Promise(async (res, rej) => {
        try {
          for (const v of this.sequence.values())
            if (typeof v === "object") await on_array(v);
            else await on_number(v);

          await on_end?.();

          res();
        } catch (e) {
          rej(e);
        }
      });
    }
  }
}

namespace Device {
  export class Device {
    public readonly name: string;

    protected readonly actuatorCount: number;
    protected readonly oscillatorCount: number;
    protected readonly linearCount: number;
    protected readonly rotatorCount: number;

    public readonly canVibrate = (): this is VibratingDevice =>
      this.actuatorCount > 0;
    public readonly canOscillate = (): this is OscillatingDevice =>
      this.oscillatorCount > 0;
    public readonly canRotate = (): this is RotatingDevice =>
      this.rotatorCount > 0;
    public readonly canSlide = (): this is SlidingDevice =>
      this.linearCount > 0;

    protected readonly scalars: Map<
      Buttplug.ActuatorType,
      Array<Buttplug.ScalarSubcommand>
    > = new Map();

    constructor(
      protected plugin: NvimPlugin,
      protected device: Buttplug.ButtplugClientDevice,
    ) {
      this.name = device.displayName ?? device.name;

      this.actuatorCount = device.vibrateAttributes.length;
      this.oscillatorCount = device.oscillateAttributes.length;
      this.linearCount = device.linearAttributes.length;
      this.rotatorCount = device.rotateAttributes.length;

      for (let i = 0; i < this.actuatorCount; i++)
        this.SetScalar(
          ActuatorType.Vibrate,
          new ScalarSubcommand(i, 0.1, ActuatorType.Vibrate),
        );
      for (let i = 0; i < this.linearCount; i++)
        this.SetScalar(
          ActuatorType.Position,
          new ScalarSubcommand(i, 0.1, ActuatorType.Position),
        );
      for (let i = 0; i < this.oscillatorCount; i++)
        this.SetScalar(
          ActuatorType.Oscillate,
          new ScalarSubcommand(i, 0.1, ActuatorType.Oscillate),
        );
      for (let i = 0; i < this.rotatorCount; i++)
        this.SetScalar(
          ActuatorType.Rotate,
          new ScalarSubcommand(i, 0.1, ActuatorType.Rotate),
        );
    }

    protected FixRange(
      ranges: number | (number | boolean | undefined | null)[],
      attributeList: Buttplug.GenericDeviceMessageAttributes[],
    ) {
      return Array.isArray(ranges)
        ? ranges
            .map((e, k) => {
              switch (typeof e) {
                case "number":
                  return Math.min(1, e - (e % attributeList[k].StepCount));
                case "boolean":
                  if (e) return 1;
                  else return 0;
                case "object":
                case "undefined":
                  return 0;
              }
            })
            // Remove all actuators that don't actually
            // exist on the device
            .filter((_, k) => k <= this.actuatorCount)
        : Array<number>(
            ranges ?? this.actuatorCount,
            attributeList[0].StepCount,
          );
    }

    public Notify(text: string): Promise<void> {
      return this.plugin.nvim.outWriteLine(`[${this.name}] stim.nvim: ${text}`);
    }

    public Error(text: string): Promise<void> {
      return this.plugin.nvim.errWriteLine(`[${this.name}] stim.nvim: ${text}`);
    }

    public SetAllScalars(
      actuatorType: Buttplug.ActuatorType,
      intensity: number,
    ) {
      intensity = Math.min(1, Math.max(0, intensity));
      for (
        let i = 0;
        i <
        (this.scalars.get(actuatorType) ??
          this.scalars.set(actuatorType, []).get(actuatorType))!.length;
        i++
      )
        this.SetScalar(
          actuatorType,
          new ScalarSubcommand(i, intensity, ActuatorType.Vibrate),
        );
    }

    public SetScalar(
      actuatorType: Buttplug.ActuatorType,
      subcommand: Buttplug.ScalarSubcommand,
    ) {
      const cur = this.scalars.get(actuatorType) ?? [];
      const i = cur.find((e) => e.Index === subcommand.Index);
      if (!i) cur.push(subcommand);
      else i.Scalar = subcommand.Scalar;

      this.scalars.set(actuatorType, cur);
    }
  }

  export class VibratingDevice extends Device {
    constructor(
      protected plugin: NvimPlugin,
      protected device: Buttplug.ButtplugClientDevice,
    ) {
      super(plugin, device);
    }

    /*
     * Unfortunately we have to use the Scalar system
     * instead of the dedicated .Vibrate() command
     * because this API sucks. Oh well!
     */
    public async Vibrate(actuators: number[] | number) {
      if (Array.isArray(actuators))
        for (let i = 0; i < actuators.length; i++) {
          this.SetScalar(
            ActuatorType.Vibrate,
            new ScalarSubcommand(i, 0.1, ActuatorType.Vibrate),
          );
        }
      else this.SetAllScalars(ActuatorType.Vibrate, actuators);

      // Scalar and Vibrate functions seemingly do not resolve
      // until the device is called to stop or to disconnect,
      // so do not await
      this.device.scalar(this.scalars.get(ActuatorType.Vibrate)!).catch((e) => {
        this.Error(`${e}`);
      });

      return true;
    }

    public async StopVibrate() {
      this.SetAllScalars(ActuatorType.Vibrate, 0);
      return this.device.scalar(this.scalars.get(ActuatorType.Vibrate)!);
    }

    public async VibrateInSequence(
      times: number,
      wait_interval_ms: number = 300,
      repeat_interval_ms: number = wait_interval_ms,
      actuators?: number | (number | boolean | undefined | null)[],
      on_end?: Parameters<Sequence.Sequence["Execute"]>[0]["on_end"],
    ) {
      const seq = new Sequence.Sequence().SetDebugPlugin(null);
      const fixedActuators = this.FixRange(
        actuators ?? this.actuatorCount,
        this.device.vibrateAttributes,
      );

      for (let i = 0; i < times; i++) {
        seq.Insert(fixedActuators);
        seq.Wait(wait_interval_ms);
        seq.Stop();
        seq.Wait(repeat_interval_ms);
      }

      return seq.Execute({
        on_number: (num) =>
          new Promise(async (res) => {
            // await this.plugin.nvim.outWriteLine(`on number called 1 (${num})`);
            setTimeout(() => {
              // this.plugin.nvim.outWriteLine(`on number called 2 (${num})`);

              res();
            }, num);
          }),
        on_array: (nums) =>
          new Promise<void>(async (res, rej) => {
            if (!nums.length) return this.StopVibrate().then(res);

            return this.Vibrate(nums)
              .then(() => res())
              .catch(async (e: Buttplug.ButtplugDeviceError) => {
                await this.plugin.nvim.errWriteLine(
                  `an error occured while vibrating: ${e}`,
                );

                rej();
              });
          }),
        on_end:
          on_end ??
          (async () => {
            // this.plugin.nvim.outWriteLine("pain");
            await this.StopVibrate();
          }),
      });
    }
  }

  export class OscillatingDevice extends Device {}
  export class RotatingDevice extends Device {}
  export class SlidingDevice extends Device {}
}

namespace stim {
  enum BUTTPLUG_METHOD {
    "CONNECT",
    "DISCONNECT",
    "PORT",
    "SELECT_DEVICE",
    "LIST_DEVICES",
    "STATUS",
    "NONE",
  }
  // const handleMethod = (method: any) =>
  //   BUTTPLUG_METHOD[method] ? method : BUTTPLUG_METHOD.NONE;

  export const nvim = (plugin: NvimPlugin) => {
    const handleError = (e: Buttplug.ButtplugError) =>
      plugin.nvim.errWriteLine(
        `stim.nvim: something went wrong - ${e.message}`,
      );

    const handleMethod = (method: any): number => {
      const handleNaN = (a: number) =>
        Number.isNaN(a) ? BUTTPLUG_METHOD.NONE : a;

      if (!Number.isNaN(Number(method))) {
        return handleNaN(
          Number(BUTTPLUG_METHOD[BUTTPLUG_METHOD[Number(method)] as never]),
        );
      } else
        return handleNaN(
          Number(BUTTPLUG_METHOD[String(method).toUpperCase() as never]),
        );
    };
    plugin.setOptions({ dev: false });

    const client = new ButtplugClient("stim.nvim");

    let selectedDevice: Device.Device | null = null;
    let address = "127.0.0.1";
    let port = 12345;

    const ButtplugHandler = async (args: string[]) => {
      const method = handleMethod(args.shift());
      switch (Number(method)) {
        case BUTTPLUG_METHOD.CONNECT:
          if (client.connected) {
            plugin.nvim.errWriteLine(
              "stim.nvim: buttplug is connected; disconnect first before attempting another connection",
            );
            return;
          }

          const connector = new ButtplugNodeWebsocketClientConnector(
            `ws://${address}:${port}`,
          );

          await client
            .connect(connector)
            .then(async () => {
              plugin.nvim.outWriteLine("stim.nvim: buttplug is connected!");
            })
            .catch((e: typeof ButtplugError) => {
              plugin.nvim.errWriteLine(
                `an error occurred while connecting:\n${e}`,
              );
            });
          break;
        case BUTTPLUG_METHOD.DISCONNECT:
          if (!client.connected) {
            await plugin.nvim.errWriteLine("stim.nvim: not connected.");

            return;
          }

          client
            .disconnect()
            .then(() => {
              plugin.nvim.outWriteLine("stim.nvim: disconnected successfully");
            })
            .catch(handleError);
          selectedDevice = null;
          break;
        case BUTTPLUG_METHOD.PORT:
          if (client.connected) {
            await plugin.nvim.errWriteLine(
              "stim.nvim: cannot change address while active",
            );

            return;
          }

          let newPort = args.pop();
          // plugin.nvim.outWriteLine(`port: ${port}`);
          if (Number.isNaN(Number(newPort))) {
            await plugin.nvim.errWriteLine("stim.nvim: invalid port");

            return;
          }

          break;
        case BUTTPLUG_METHOD.LIST_DEVICES:
          if (!client.connected) {
            await plugin.nvim.errWriteLine("stim.nvim: not connected");
            return;
          }

          const devices = client.devices;
          if (devices.length === 0) {
            await plugin.nvim.errWriteLine("stim.nvim: no devices connected.");
            return;
          }

          await plugin.nvim.outWriteLine(
            devices
              .map(
                (e) =>
                  `[${e.index}]: ${e.name} ${e.displayName ? `(${e.displayName})` : ""}`,
              )
              .join("\n"),
          );
          break;
        case BUTTPLUG_METHOD.SELECT_DEVICE:
          const index_or_name = args.join(" ");
          if (!index_or_name) {
            await plugin.nvim.errWriteLine(
              "stim.nvim: no index or name, not changing selected device.",
            );
            return;
          }

          let device: Device.Device;
          if (Number.isNaN(index_or_name))
            device = new Device.VibratingDevice(
              plugin,
              client.devices.filter((e) =>
                e.name.includes(index_or_name as string),
              )[0],
            );
          else
            device = new Device.VibratingDevice(
              plugin,
              client.devices.filter(
                (e) => e.index == parseInt(index_or_name),
              )[0],
            );

          if (!device) {
            await plugin.nvim.errWriteLine(
              `stim.nvim: no device by name (or index) ${index_or_name} found.`,
            );
            return;
          }

          selectedDevice = device;
          plugin.nvim.outWriteLine(
            `stim.nvim: connected to new device '${device.name}'.`,
          );
          break;
        case BUTTPLUG_METHOD.NONE:
          if (selectedDevice) {
            if (selectedDevice.canVibrate())
              selectedDevice
                .VibrateInSequence(2, 300, 150)
                .then(() => {
                  plugin.nvim.outWriteLine("stim.nvim: buzz buzz!");
                })
                .catch(handleError)
                .finally(() => {
                  plugin.nvim.outWriteLine(
                    "(if you didn't feel anything, something's wrong...)",
                  );
                });
            else selectedDevice.Notify(`could not find a test activator`);
          } else
            plugin.nvim.errWriteLine(
              `stim.nvim: no device selected. you might want to do that?`,
            );
          break;
        default:
          plugin.nvim.errWriteLine(`stim.nvim: invalid protocol (${method}).`);
          break;
      }
    };

    // plugin.registerFunction(
    //   "SetLines",
    //   () =>
    //     new Promise<void>((res, rej) => {
    //       return plugin.nvim
    //         .setLine("May I offer you an egg in these troubling times")
    //         .then(() => {
    //           plugin.nvim.outWriteLine("Line should be set");
    //           res();
    //         });
    //     }),
    //   { sync: false },
    // );

    // Command hours
    // TODO: use a map for this or something
    const functionOpts = { sync: false };
    plugin.registerFunction(
      "ButtplugDisconnect",
      () =>
        new Promise<void>((res) => {
          ButtplugHandler([String(BUTTPLUG_METHOD.DISCONNECT)]).then(() =>
            res(),
          );
        }),
      functionOpts,
    );

    plugin.registerFunction(
      "ButtplugTest",
      () =>
        new Promise<void>((res) => {
          ButtplugHandler([String(BUTTPLUG_METHOD.NONE)]).then(() => res());
        }),
      functionOpts,
    );

    plugin.registerFunction(
      "ButtplugPort",
      ([port]: [string]) =>
        new Promise<void>((res) => {
          ButtplugHandler([String(BUTTPLUG_METHOD.PORT), port]).then(() =>
            res(),
          );
        }),
      functionOpts,
    );

    plugin.registerFunction(
      "ButtplugConnect",
      () =>
        new Promise<void>((res) => {
          ButtplugHandler([String(BUTTPLUG_METHOD.CONNECT)]).then(() => res());
        }),
      functionOpts,
    );
    plugin.registerFunction(
      "ButtplugIsConnected",
      () => (selectedDevice !== null ? 1 : 0),
      functionOpts,
    );

    plugin.registerFunction(
      "ButtplugSelectDevice",
      ([device_id]: [string]) =>
        new Promise<void>((res) => {
          ButtplugHandler([
            String(BUTTPLUG_METHOD.SELECT_DEVICE),
            device_id,
          ]).then(() => res());
        }),
      functionOpts,
    );

    plugin.registerFunction(
      "ButtplugListDevices",
      () =>
        new Promise<void>((res) => {
          ButtplugHandler([String(BUTTPLUG_METHOD.LIST_DEVICES)]).then(() =>
            res(),
          );
        }),
      functionOpts,
    );

    // Register device-type-specific functions
    plugin.registerFunction(
      "ButtplugVibrate",
      ([intensity, duration_ms]: [
        number | Array<number>,
        duration_ms: number,
      ]) =>
        new Promise<void>(async (res, rej) => {
          if (!selectedDevice)
            return plugin.nvim
              .outWriteLine(`stim.nvim: no selected device`)
              .then(() => res());
          else if (selectedDevice.canVibrate()) {
            const vibratingDevice = selectedDevice as Device.VibratingDevice;
            vibratingDevice.Vibrate(intensity).then(() => {
              if (duration_ms) {
                setTimeout(() => {
                  vibratingDevice.StopVibrate().then(() => res());
                }, duration_ms);
              } else res();
            });
          } else
            selectedDevice
              .Notify(`this device does not support the 'Vibrate' handler`)
              .then(() => rej());
        }),
      functionOpts,
    );

    plugin.registerFunction(
      "ButtplugVibrateStop",
      () =>
        new Promise<void>(async (res, rej) => {
          if (!selectedDevice)
            return plugin.nvim
              .outWriteLine(`stim.nvim: no selected device`)
              .then(() => res());
          else if (selectedDevice.canVibrate()) {
            selectedDevice.StopVibrate();
          } else
            selectedDevice
              .Notify(`this device does not support the 'Vibrate' handler`)
              .then(() => rej());
        }),
      functionOpts,
    );

    // Register main handler
    plugin.registerCommand("Buttplug", ButtplugHandler, {
      sync: false,
      nargs: "*",
    });
  };
}

// my god i'm so smart
module.exports = stim.nvim;
