Network speed monitor
=====================

Simple Cinnamon applet to display current network speed.

NOTICE: This project has been discontinued. Any developer who wants to fork it and continue development is welcome!


License
-------
This is free software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or
distribute this software, either in source code form or as a compiled
binary, for any purpose, commercial or non-commercial, and by any
means.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.


Installation
------------

- This applet requires this library: `gir1.2-gtop-2.0`. On Mint/Ubuntu it can be installed with this command:
`sudo apt-get install gir1.2-gtop-2.0`
- Copy the folder `netspeed@adec` to `~/.local/share/cinnamon/applets/`
- Enable the applet in "Cinnamon Settings"


Usage
-----

The applet automatically monitors the first active network interface found at Cinnamon startup. You can change the monitored interface right-clicking on the applet.


Customization
-------------

The applet is now styled through the `stylesheet.css` file. You can modify, for example, the alignment of the text by changing the "`text-align`" property.


Test
----

The script was tested with Cinnamon 1.7.2 on Ubuntu 12.10.
