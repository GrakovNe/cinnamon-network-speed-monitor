Network speed monitor
=====================

Simple Cinnamon applet to display current network speed.


Installation
------------

- This applet requires this library: `gir1.2-gtop-2.0`. On Mint/Ubuntu it can be installed with this command:
`sudo apt-get install gir1.2-gtop-2.0`
- Copy the folder `netspeed@adec` to `~/.local/share/cinnamon/applets/`
- Enable the applet in "Cinnamon Settings"


Usage
-----

The applet automatically monitors the first active network interface found at Cinnamon startup. You can change the monitored interface right-clicking on the applet.


Test
----

The script was tested with Cinnamon 1.5.7 on Mint 13.
