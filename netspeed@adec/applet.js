const Applet = imports.ui.applet;
const Cinnamon = imports.gi.Cinnamon;
const GLib = imports.gi.GLib;
const GTop = imports.gi.GTop;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;
const NetworkManager = imports.gi.NetworkManager;
const Main = imports.ui.main;

function MyMenu(launcher, orientation) {
    this._init(launcher, orientation);
}
MyMenu.prototype = {
    __proto__: PopupMenu.PopupMenu.prototype,
    _init: function(launcher, orientation) {
        this._launcher = launcher;
        PopupMenu.PopupMenu.prototype._init.call(this, launcher.actor, 0.0, orientation, 0);
        Main.uiGroup.add_actor(this.actor);
        this.actor.hide();
    }
}

function MyApplet(metadata, orientation) {
	this._init(metadata, orientation);
};

MyApplet.prototype = {
	__proto__: Applet.Applet.prototype,

    _init: function(metadata, orientation) {
        Applet.Applet.prototype._init.call(this, orientation);
        this.path = metadata.path;
        this.settingsFile = this.path+"/settings.json";
        
        this.labelDownload = new St.Label({ reactive: true, track_hover: true, style_class: "netspeed-applet"});
        this.labelUpload = new St.Label({ reactive: true, track_hover: true, style_class: "netspeed-applet"});
        this.actor.add(this.labelDownload, {y_align: St.Align.MIDDLE, y_fill: false});
        this.actor.add(this.labelUpload, {y_align: St.Align.MIDDLE, y_fill: false});

		try {
			this.monitoredInterfaceName = null;
			
			this.loadSettings();
			
			this.menuManager = new PopupMenu.PopupMenuManager(this);
            this.menu = new MyMenu(this, orientation);
            this.menuManager.addMenu(this.menu);
			this.makeMenu();
			this.buildContextMenu();

			this.gtop = new GTop.glibtop_netload();
			this.timeOld = GLib.get_monotonic_time();
			this.upOld = 0;
			this.downOld = 0;
			
			let lastUsedInterface = this.settings.lastUsedInterface;
			if(this.isInterfaceAvailable(lastUsedInterface)) {
				this.setMonitoredInterface(lastUsedInterface);
			}
			
			this.update();
		}
		catch (e) {
			global.logError(e);
		}
	},
	
	getInterfaces: function() {
		return imports.gi.NMClient.Client.new().get_devices();
	},
	
	isInterfaceAvailable: function(name) {
		let interfaces = this.getInterfaces();
		if(interfaces!=null) {
			for(let i=0; i<interfaces.length; i++) {
				let iname = interfaces[i].get_iface();
				if(iname==name && interfaces[i].state == NetworkManager.DeviceState.ACTIVATED) {
					return true;
				}
			}
		}
		return false;
	},
	
	makeMenu: function() {
		this.menu.removeAll();
		if(this.monitoredInterfaceName!=null) {
			this.menuitemInfo = new PopupMenu.PopupMenuItem("info", { reactive: false });
			this.menu.addMenuItem(this.menuitemInfo);
			this.menuitemInfo.label.text = this.monitoredInterfaceName+" - Downloaded: "+this.formatSentReceived(this.downOld)+" - Uploaded: "+this.formatSentReceived(this.upOld);
		} else {
			this.menuitemInfo = new PopupMenu.PopupMenuItem("No network monitored. Please select one right-clicking the applet.", { reactive: false });
			this.menu.addMenuItem(this.menuitemInfo);
		}
	},
	
	buildContextMenu: function() {
		this._applet_context_menu.removeAll();
		this._applet_context_menu.addMenuItem(new PopupMenu.PopupMenuItem("Select the interface to be monitored:", { reactive: false }));
		
		let interfaces = this.getInterfaces();
		if(interfaces!=null) {
			for(let i=0; i<interfaces.length; i++) {
				let name = interfaces[i].get_iface();
				let menuitem = new PopupMenu.PopupMenuItem(name);
				menuitem.connect('activate', Lang.bind(this, function() {
					this.settings.lastUsedInterface = name;
					this.saveSettings();
					this.setMonitoredInterface(name);
				}));
				this._applet_context_menu.addMenuItem(menuitem);
			}
		}
		
		this._applet_context_menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
		let menuitem = new PopupMenu.PopupMenuItem("Settings");
		menuitem.connect('activate', Lang.bind(this, this.openSettings));
		this._applet_context_menu.addMenuItem(menuitem);
	},
	
	openSettings: function() {
		[success, pid, stdin, stdout, stderr] = GLib.spawn_async_with_pipes(this.path, ["/usr/bin/gjs","settings.js",this.settingsFile], null, GLib.SpawnFlags.DO_NOT_REAP_CHILD, null);
		GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, Lang.bind(this, this.onSettingsWindowClosed));
	},
	
	onSettingsWindowClosed: function(pid, status, requestObj) {
		this.loadSettings();
	},
	
	setMonitoredInterface: function(name) {
		this.monitoredInterfaceName = name;
		GTop.glibtop_get_netload(this.gtop, this.monitoredInterfaceName);
		this.upOld = this.gtop.bytes_out;
		this.downOld = this.gtop.bytes_in;
		this.set_applet_tooltip("Monitored interface: " + this.monitoredInterfaceName);
	},

	on_applet_clicked: function(event) {
		if(!this.menu.isOpen) {
			this.makeMenu();
		}
		this.menu.toggle();
	},

	update: function() {
		if(this.monitoredInterfaceName!=null) {
			let timeNow = GLib.get_monotonic_time();
			let deltaTime = (timeNow-this.timeOld)/1000000;
			
			GTop.glibtop_get_netload(this.gtop, this.monitoredInterfaceName);
			let upNow = this.gtop.bytes_out;
			let downNow = this.gtop.bytes_in;
			
			if(deltaTime!=0) {
				this.labelDownload.set_text("D: "+this.formatSpeed((downNow-this.downOld)/deltaTime));
				this.labelUpload.set_text("U: "+this.formatSpeed((upNow-this.upOld)/deltaTime));
			}
					
			this.upOld = upNow;
			this.downOld = downNow;
			this.timeOld = timeNow;
		} else {
			this.labelDownload.set_text("No net!");
		}
		Mainloop.timeout_add(this.settings.refreshInterval*1000, Lang.bind(this, this.update));
	},
	
	formatSpeed: function(value) {
		let decimalAdjust = Math.pow(10, this.settings.decimalsToShow);
		if(value<1048576) return (Math.round(value/1024*decimalAdjust)/decimalAdjust) + " KB/s";
		else return (Math.round(value/1048576*decimalAdjust)/decimalAdjust) + " MB/s";
	},
	
	formatSentReceived: function(value) {
		if(value<1048576) return Math.round(value/1024)+" KB";
		else return Math.round((value/1048576)*10)/10+" MB";
	},
	
	loadSettings: function() {
		try {
			this.settings = JSON.parse(Cinnamon.get_file_contents_utf8_sync(this.settingsFile));
		} catch(e) {
			global.logError(e);
			global.logError("Settings file not found. Using default values.");
			this.settings = JSON.parse('{"lastUsedInterface":"eth0","refreshInterval":1,"decimalsToShow":0}');
		}
	},
	
	saveSettings: function() {
		let file = Gio.file_new_for_path(this.settingsFile);
		let outputFile = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
		let out = Gio.BufferedOutputStream.new_sized(outputFile, 1024);
		Cinnamon.write_string_to_stream(out, JSON.stringify(this.settings));
		out.close(null);
	}
};

function main(metadata, orientation) {
	let myApplet = new MyApplet(metadata, orientation);
	return myApplet;
}
