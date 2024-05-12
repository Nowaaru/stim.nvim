# stim.nvim ⚡

Probably my worst mistake yet.

<h3> Why?</h3>

<p>
    I found out there are programmable buttplugs.
    <br />
    I wanted to program buttplugs.
    <h6><sub>I'm a simple man, really...</sub></h6>
</p>

<h3>Getting Started</h3>
<h4> Installation</h5>
 ‼️ Make sure you have <a href="https://nodejs.org"><b>Node.JS</b></a> installed.
<br />
<ul>
    <li>
        ❄️ NixOS Users:
        <ol>
            <li>Add this repository as a flake input.</li>
            <li>Symlink or copy the output directory to somewhere in your <a href="https://github.com/neovim/node-client/issues/106">runtime path</a>.
        </ol>
    </li>
    <li>
        🧠 Sane Users
        <ul>
            <li>Use your favorite package manager.</li>
            <li>If you're weird, then clone the repository and link (or move) the contents of <code>src</code> to somwhere in your <a href="https://github.com/neovim/node-client/issues/106">runtime path</a>.
        </ul>
    </li>
</ul>

<h4>Intiface</h5>
<p>
    Make sure that you have <a href="https://intiface.com/central"><b>Intiface Central</b></a> installed.<br/>
    If not that, I hope you have some really snazzy engine doing your work for you.<br />
</p>
<h4>Initialization</h5>
<p>
    First and foremost, connect your device to Intiface or whatever substitute you're using.<br />
    If the connection isn't working, then try using a different port (see below).<br />
    <br />
    To get started with the plugin, first connect using <code>:Buttplug connect</code> (or <code>:Buttplug 0</code>).<br/>
    If all goes well, you should see a notification appear confirming that the connection was made.<br/>
    To disconnect, use <code>:Buttplug disconnect</code> (or <code>:Buttplug 1</code>).
</p>
<h4>Device Connection</h4>
<p>
    Secondly, list the devices using <code>:Buttplug list_devices</code>.<br/>
    When you've found the identifier (contained in square brackets) of your device, use the <code>:Buttplug select_device [device_id]</code> command to select it.<br/>
    <br/>
    Upon success, a notification should appear stating so.
</p>
<h4>The Fun-ger Games</h4>
<p>
    To make sure things are working, run the <code>:Buttplug</code> command
    to test your device.<br/>
    Some may go buzz-buzz, some may go slide-slide, some may go boom-boom. Find out for yourself!<br/>
    <br />
    If you're curious on what kind of shenanigans you can get up to with this module, check out the <a href="https://github.com/nowaaru/stim.nvim/blob/master/src/lua/stim/nvim/init.lua">example module</a>. To test it yourself, run the <code>:lua require("stim.nvim"):initialize_test()</code> method. Make sure that your device is connected!
</p>
<h4>What now?</h4>
<p>
    Go ahead and write <i>your</i> plugin. This is essentially hodge-podge of a Neovim interface for Intiface.<br/>
    <br/>
    You can use an <a href="https://neovim.io/doc/user/autocmd.html">autocommand</a> to call the
    exposed functions like <code>vim.fn.ButtplugVibrate([intensity], [duration])</code> or to even call commands such as <code>:Buttplug Vibrate [intensity] [duration] [...actuators]</code> if you slide that way. 
</p>
<h3>Contributing</h3>
In all honesty, I don't have the time nor do I have the money to support every device
under the sun. I would deeply appreciate it if those that <i>do</i> extended the <code>Device</code> namespace in the module.<br />
<br />
I apologize for the lack of cohesion, but I tried to do my best with the resources I had. The emittable <code>import</code> syntax does not work and changing the <code>main</code> file past top-level can completely break the Node client. Thus, the source directory and the output directory must be in the same place and code that serves a certain, special purpose must be contained in a namespace.
<hr />
<h6><sup><sup>Heavily inspired by <a href=https://marketplace.visualstudio.com/items?itemName=UncensorPat.prohe/>PROHE</a> by <a href="https://marketplace.visualstudio.com/publishers/UncensorPat">UncensorPat</a>.</h6></sup></sup>
