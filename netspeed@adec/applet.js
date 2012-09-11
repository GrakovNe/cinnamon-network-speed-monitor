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
const SettingsFile = GLib.build_filenamev([global.userdatadir, 'applets/netspeed@adec/settings.json']);

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

function MyApplet(orientation) {
	this._init(orientation);
};

MyApplet.prototype = {
	__proto__: Applet.TextApplet.prototype,

    _init: function(orientation) {
        Applet.TextApplet.prototype._init.call(this, orientation);

		try {
			this.UPDATEINTERVAL = 1000; // <-- UPDATE INTERVAL (in milliseconds)
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
			//this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
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
			
			this.set_applet_label("D: "+this.formatSpeed(downNow-this.downOld)+" U: "+this.formatSpeed(upNow-this.upOld));
					
			this.upOld = upNow;
			this.downOld = downNow;
			this.timeOld = timeNow;
		} else {
			this.set_applet_label("No net!");
		}

		Mainloop.timeout_add(this.UPDATEINTERVAL, Lang.bind(this, this.update));
	},
	
	formatSpeed: function(value) {
		return Math.round(value/1024)+" KB/s";
	},
	
	formatSentReceived: function(value) {
		if(value<1048576) return Math.round(value/1024)+" KB";
		else return Math.round((value/1048576)*10)/10+" MB";
	},
	
	loadSettings: function() {
		try {
			this.settings = JSON.parse(Cinnamon.get_file_contents_utf8_sync(SettingsFile));
		} catch(e) {
			global.logError(e);
			global.logError("Settings file not found. Using default values.");
			this.settings = JSON.parse("{\"lastUsedInterface\":\"eth0\"}");
		}
	},
	
	saveSettings: function() {
		let file = Gio.file_new_for_path(SettingsFile);
		let outputFile = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
		let out = Gio.BufferedOutputStream.new_sized(outputFile, 1024);
		Cinnamon.write_string_to_stream(out, JSON.stringify(this.settings));
		out.close(null);
	}
};

function main(metadata, orientation) {
	let myApplet = new MyApplet(orientation);
	return myApplet;
}
