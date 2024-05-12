{
  description = "Vrrr, vrrr.";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
    flake-utils.url = "github:numtide//flake-utils";
  };

  outputs = {
    nixpkgs,
    flake-utils,
    ...
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = import nixpkgs {
        inherit system;
      };
    in {
      devShells.default = pkgs.mkShell {
        packages = [pkgs.intiface-central];

        shellHook = ''
          intiface_central &
          PID=&!
          tsc --watch --pretty --project src/rplugin/node/stim.nvim

          trap 'kill $PID' EXIT
        '';
      };

      packages.default = pkgs.stdenv.mkDerivation {
        pname = "stim.nvim";
        version = "v1.0.0";
        src = ./src;

        buildPhase = ''
          mkdir $out;
        '';

        installPhase = ''
          ls $src
          cp -r $src/* $out
        '';

        meta = {};
      };
    });
}
