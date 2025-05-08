{pkgs}: {
  deps = [
    pkgs.google-cloud-sdk-gce
    pkgs.bash
    pkgs.nodePackages.prettier
    pkgs.lsof
  ];
}
