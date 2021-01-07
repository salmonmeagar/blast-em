'use strict';

//initialize stuff
var tanks = [];
var projectiles = [];
var explosions = [];

var round = false;

//terrain layer, backdrop layer, clicking layer, and weapon icon
var trc = eid('trCanvas');
var trx = trc.getContext('2d');
trx.imageSmoothingEnabled = false;
trc.width = window.innerWidth-6;
trc.height = window.innerHeight-6;
var bgc = eid('bgCanvas');
var btx = bgc.getContext('2d');
btx.imageSmoothingEnabled = false;
bgc.width = window.innerWidth-6;
bgc.height = window.innerHeight-6;
var ccc = eid('clickCanvas');
var ctx = ccc.getContext('2d');
ctx.imageSmoothingEnabled = false;
ccc.width = window.innerWidth;
ccc.height = window.innerHeight;
var wc = eid('canvasIcon');
var wtx = wc.getContext('2d');
wtx.imageSmoothingEnabled = false;
wtx.fillStyle = '#000000';
wc.width = 10;
wc.height = 10;
var atx;
var osc;
var counter;

function color([r,g,b]) {
	return 'rgb('+r+','+g+','+b+')';
}

//checks to see if rgb value at a position matches a color
function colorIs(ctx,x,y,color) {
	var tColor = ctx.getImageData(x,y,1,1).data;
	//if any values are different it's not the same color
	return (tColor[0] == color[0] && tColor[1] == color[1] && tColor[2] == color[2] && tColor[3] == color[3]);
}

//returns list of pixels to form unbroken line between 2 points
function line (x1,y1,x2,y2) {
	//transform line to go right & down, with a slope less than 1
	var flipXY = (Math.abs(y2-y1) > Math.abs(x2-x1));
	if (flipXY) {
		var t1 = x1;
		var t2 = x2;
		x1 = y1;
		x2 = y2;
		y1 = t1;
		y2 = t2;
	}
	var flipX = (x1 > x2);
	var flipY = (y1 < y2);
	x1 -= 2*x1*flipX;
	x2 -= 2*x2*flipX;
	y1 -= 2*y1*flipY;
	y2 -= 2*y2*flipY;
	//find slope
	var slope = (y2-y1)/(x2-x1);
	var indx = 0;
	var pixels = [];
	//iterate through X positions, and approximate the Y posistion based on the slope
	while (indx < (x2-x1)) {
		pixels.push([x1+indx,Math.round(y1+indx*slope)]);
		indx++;
	}
	//remember the endpoint
	pixels.push([x2,y2]);
	//undo transformations
	for (i in pixels) {
		pixels[i][0] -= 2*pixels[i][0]*flipX;
		pixels[i][1] -= 2*pixels[i][1]*flipY;
		if (flipXY) {
			var t = pixels[i][0];
			pixels[i][0] = pixels[i][1];
			pixels[i][1] = t;
		}
	}
	return pixels;
}


//physics & environment stuff
var world = {
	sky: 'clear',
	terrainDestruction: true,
	terrainGravity: false,
	terrainColor: [255,100,0],
	ceiling: false,
	walls: 'wrap',
	wind: 0.0,
	windVariance:0.0,
	drag: 0.025,
	gravity: 1,
	width: trc.width,
	height: trc.height,
	collapsible: [],
};
	
//rules & stuff. might remove
var game = {
	delay: 32,
	rounds: 4,
	rule: 'last',
	limitedPower: false,
	cumulatePoints: false,
	earnPoints: true,
	bulletTrails: false,
	tankGravity: true,
	fallDamage: false,
	invisibleStats: false,
	turn: 0,
	actionable: true,
	hits: [],
};
	
//terrain generator stuff
var generator = {
	sprawl: 50,
	rise: 2,
	cavern: false,
	trees: true,
	rocks: true,
	statues: false,
	population: 0.015,
	structureSize: 1.5,
};

//initial players
var players = [
	{
		name: 'sinom',
		style: 2,
		mobile: true,
		length: 3,
		team: 1,
		points: 5,
		level: 0,
	},
	{
		name: 'mals',
		style: 3,
		mobile: true,
		length: 5,
		team: 8,
		points: 5,
		level: 0,
	},
	{
		name: 'soog',
		style: 0,
		mobile: false,
		length: 4,
		team: 10,
		points: 5,
		level: 0,
	},
	{
		name: 'ijoop',
		style: 1,
		mobile: false,
		length: 2,
		team: 4,
		points: 5,
		level: 0,
	},
];

var walls = [
	'concrete',
	'rubber',
	'wrap'
	];
	
var skies = [
	'clear',
	'night',
	'sunset'
	];

//teams
var teams = [
	[255,0,0],
	[0,0,255],
	[0,255,0],
	[255,255,0],
	[255,0,255],
	[0,255,255],
	[0,0,0],
	[255,255,255],
	[251,202,218],
	[255,100,0],
	[167,180,244],
];

var teamNames = [
	'red',
	'blue',
	'green',
	'yellow',
	'magenta',
	'cyan',
	'black',
	'white',
	'pink',
	'dirt',
	'sky'
];

//pixel coordinates for tank features
var styles = [
	[2,2,0,0,0,1,1,1,2,1,3,1,1,2],
	[3,2,1,1,2,1,3,1,4,1,1,2],
	[2,2,2,1,3,1,1,2],
	[3,1,1,1,2,1,1,2],
];

//pixel coordinates for weapon icons
var weaponIcons = [
	[1,3,1,4,1,5,2,4,3,3,3,4,3,5,4,3,4,4,4,5,5,3,5,4,5,5,6,4],
	[1,4,2,4,2,5,3,3,3,4,3,5,3,6,4,2,4,3,4,4,5,2,5,3,6,1],
	[0,7,1,6,2,5,3,4,2,3,4,5,4,3,4,1,6,3],
	[0,3,1,1,1,6,2,4,3,2,3,3,3,4,3,7,4,0,4,3,4,4,4,5,5,3,6,1,6,6,7,4],
];


//friendly weapon type names
var weaponNames = [
	'shell',
	'rocket',
	'laser',
	'firework',
];


//friendly weapon property names
var weaponProps = [
	['Size','Leaps','Splits','Trail'],
	['Size','Fuel','Thrust','Delay'],
	['Size','Energy','Length','Color'],
	['Size','Charge','Fuse','Trail']
];

//dialog box text choices
var hitTerms = [
	'got ', "hit ", 'blasted ', 'plonked ', "ploinked ", 'donked ', 'zoinked ', 'nailed ', 'damaged ', "bonk'd ", 'bagoomed ',
	];
	
var missTerms = [
	'hit nobody', 'did bad', 'failed', 'missed', 'whiffed', 'blew it', 'did not bagoom',
	];
	
var dieTerms = [
	' died.', " bagoom'd", ' got blasted', "'s toast.", ' ascended.', ' hath departed this mortal coil.', ' down!', ' goeth into the night.', '? More like dead.'
	];
	
var startRemarks = [
	'nothing has happened yet.', 'GAME START', 'Ready player 1', "time to play Blast 'Em", "redy 4 batl"
	];
	

//tank object
class tank {
	constructor(name,style,mobile,length,team,pos,points,brain) {
		this.name = name;
		this.style = style;
		this.mobile = mobile,
		this.length = length;
		this.team = team;
		this.power = Math.min(this.length*50,500);
		this.angle = 45;
		this.flipped = pos[0] > world.width/2;
		this.pos = pos;
		this.hp = this.length*10;
		this.mp = this.length*10;
		this.points = points;
		this.weapon = 0;
		this.brain = brain;
		this.score = 0;
		tanks.push(this);
		this.index = tanks.indexOf(this);
	}
	
	pixelLength() {
		//in-game length of tank in pixels
		return (3+2*this.length);
	}
	
	tankPixels() {
		//fetch accent pixel locations and add them to a list
		var pixels = [];
		for (i in styles[this.style]) {
			pixels.push(styles[this.style][i]);
		}
		//barrel is line from pivot to point on circle according to aim angle, with the radius scaling by tank length
		var ang = this.angle;
		var barrel = line(pixels[0],pixels[1],Math.floor(pixels[0]+dummyCos(ang)*(this.length+3-(ang == 0 || ang == 90))),Math.floor(pixels[1]+dummySin(ang)*(this.length+3-(ang == 0 || ang == 90))));
		for (i in barrel) {
			pixels.push(barrel[i][0]);
			pixels.push(barrel[i][1]);
		}
		return pixels;
	}
	
	draw() {
		//initialize tank length in pixels
		var length = this.pixelLength();
		var org = this.pos[0]-Math.floor(length/2);
		//initialize tank color & pixels
		trx.fillStyle = color(this.team);
		var pixels = this.tankPixels();
		//draw accent pixels + barrel on proper side
		if (this.flipped) {
			for (var i = 1; i < pixels.length/2; i++) {
				trx.fillRect(org+length-pixels[i*2]-1,world.height-this.pos[1]-pixels[i*2+1]-2,1,1);
			}
		} else {
			for (var i = 1; i < pixels.length/2; i++) {
				trx.fillRect(org+pixels[i*2],world.height-this.pos[1]-pixels[i*2+1]-2,1,1);
			}
		}
		//draw base, different between mobile and non-mobile tanks
		//bases are modular and depend on tank length
		if (this.mobile) {
			trx.fillRect(org,world.height-this.pos[1]-2,length,2);
			trx.fillStyle = '#5d5d5d';
			trx.fillRect(org+1,world.height-this.pos[1]-1,length-2,2);
			for (var i = 1; i < this.length+1; i++) {
				trx.clearRect(org+i*2,world.height-this.pos[1]-1,1,1);
			}
		} else {
			trx.fillRect(org+1,world.height-this.pos[1]-2,length-2,2);
			trx.fillRect(org,world.height-this.pos[1]-1,length,2);
			trx.fillStyle = '#5d5d5d';
		}
		//draw pivot
		if (this.flipped) {
			trx.fillRect(org+length-pixels[0]-1,world.height-this.pos[1]-pixels[1]-2,1,1);
		} else {
			trx.fillRect(org+pixels[0],world.height-this.pos[1]-pixels[1]-2,1,1);
		}
	}
	
	undraw() {
		//the exact same as draw, but all fillrects are replaced with clearrects
		var length = this.pixelLength();
		var org = this.pos[0]-Math.floor(length/2);
		var pixels = this.tankPixels();
		if (this.flipped) {
			for (var i = 0; i < pixels.length/2; i++) {
				trx.clearRect(org+length-pixels[i*2]-1,world.height-this.pos[1]-pixels[i*2+1]-2,1,1);
			}
		} else {
			for (var i = 0; i < pixels.length/2; i++) {
				trx.clearRect(org+pixels[i*2],world.height-this.pos[1]-pixels[i*2+1]-2,1,1);
			}
		}
		if (this.mobile) {
			trx.clearRect(org,world.height-this.pos[1]-2,length,2);
			trx.clearRect(org+1,world.height-this.pos[1]-1,length-2,2);
		} else {
			trx.clearRect(org+1,world.height-this.pos[1]-2,length-2,2);
			trx.clearRect(org,world.height-this.pos[1]-1,length,2);
		}
	}
	
	fire() {
		//check the weapon can actually be afforded
		if (this.points >= artilleryCost()) {
			//find pixel position of barrel
			var length = this.pixelLength();
			var org = this.pos[0]-Math.floor(length/2);
			var pixel = styles[this.style];
			if (this.flipped) {
				var ang = -this.angle+180;
				var pos = [org+length-pixel[0]-1+dummyCos(ang)*(this.length+5),this.pos[1]+pixel[1]+dummySin(ang)*(this.length+5)+2];
			} else {
				var ang = this.angle;
				var pos = [org+pixel[0]+dummyCos(ang)*(this.length+5),this.pos[1]+pixel[1]+dummySin(ang)*(this.length+5)+2];
			}
			//calculate velocity vector
			var power = [dummyCos(ang)*(this.power/20),dummySin(ang)*(this.power/20)];
			//initialize weapon properties
			var weapon = this.weapon;
			var atrV = document.getElementsByClassName('quantity');
			var atr = [];
			for (var i = 0; i < 4; i++) {
				atr.push(Math.min(atrV[i].value,10));
				atrV[i].value = 0;
			}
			atrV[0].value = 1;
			new projectile(weapon,pos,power,ang,atr,this,true);
			//mark projectile for hit reporting
			game.hits.push('relevant');
			//announce turn
			eid("dialogdivheader").innerHTML = this.name+"'s turn!";
			//advance turn
			game.turn++;
		}
	}
	
	move(n) {
		//only mobile tanks on the ground can move
		if (this.mobile && this.grounded()) {
			this.undraw();
			//move up a pixel so hills can be scaled
			this.pos[1]++;
			//calculate target pixel
			var hL = Math.floor(this.pixelLength()/2)+1;
			var pixelsOpen = true;
			//test if target pixel is vacant by checking the alpha value on the terrain canvas.
			//this way, anything drawn on the terrain canvas is valid terrain, including other tanks.
			for (var y = this.pos[1]+1; y < this.pos[1]+3; y++) {
				var pixel = trx.getImageData(this.pos[0]+hL*n,world.height-y,1,1).data[3];
				if (pixel) {
					pixelsOpen = false;
				}
				if (this.pos[0]+hL*n < 0 || this.pos[0]+hL*n >= world.width) {
					pixelsOpen = false;
				}
			}
			if (pixelsOpen) {
				this.pos[0]+=n;
				osc.frequency.value = 40;
			}
			//fall mid-frame in case a hill wasn't scaled
			this.settle();
			this.draw();
		}
	}
	
	grounded() {
		if (!game.tankGravity) {
			return true;
		}
		//half length
		var hL = Math.floor(this.pixelLength()/2);
		var y = this.pos[1]-1;
		for (var x = this.pos[0]-hL+1; x < this.pos[0]+hL; x++) {
			var pixel = trx.getImageData(x,world.height-y,1,1).data[3];
			if (pixel) {
				return true;
			}
		}
		var lpixel = trx.getImageData(this.pos[0]-hL,world.height-y-this.mobile,1,1).data[3];
		var rpixel = trx.getImageData(this.pos[0]+hL,world.height-y-this.mobile,1,1).data[3];
		if ((lpixel && rpixel)) {
			return true;
		}	
		return false;
	}
	
	settle() {
		if (!game.tankGravity) {
			return false;
		}
		//half length
		var hL = Math.floor(this.pixelLength()/2);
		var y = this.pos[1]-1;
		//fall over open air
		var slide = 0;
		for (var x = this.pos[0]-hL+1; x < this.pos[0]+hL; x++) {
			var pixel = trx.getImageData(x,world.height-y,1,1).data[3];
			if (pixel) {
				return false;
			}
		}
		//fall & slide left & right down steep slopes
		var lpixel = trx.getImageData(this.pos[0]-hL,world.height-y-this.mobile,1,1).data[3];
		var rpixel = trx.getImageData(this.pos[0]+hL,world.height-y-this.mobile,1,1).data[3];
		if ((lpixel && rpixel)) {
			return false;
		} else if (lpixel) {
			if (this.pos[0]+hL >= world.width-1) {
				return false;
			}
			slide = 1;
		} else if (rpixel) {
			if (this.pos[0]-hL < 1) {
				return false;
			}
			slide = -1;
		}
		this.undraw();
		this.pos[0]+=slide;
		this.pos[1]--;
		//fall damage
		if (game.fallDamage && !this.grounded()) {
			this.hp--;
			if (this.hp() < 1) {
				game.actionable = false;
				game.hits.push(this.name+' fell.');
			}
		}
		this.draw();
		return true;
	}
	
	//tanks flip when they hit 90
	incrementAngle() {
		this.undraw();
		if (this.flipped) {
			this.angle++;
			if (this.angle > 90) {
				this.angle = 90;
				this.flipped = false;
			}
		} else {
			this.angle--;
			if (this.angle < 0) {
				this.angle = 0;
				this.flipped = true;
			}
		}
		this.draw();
		osc.frequency.value = 30+50*(this.angle%2)+10*(!(this.angle%10));
	}
	
	decrementAngle() {
		this.undraw();
		if (this.flipped) {
			this.angle--;
			if (this.angle < 0) {
				this.angle = 0;
				this.flipped = false;
			}
		} else {
			this.angle++;
			if (this.angle > 90) {
				this.angle = 90;
				this.flipped = true;
			}
		}
		this.draw();
		osc.frequency.value = 30+50*(this.angle%2)+10*(!(this.angle%10));
	}
	
	//power cannot exceed 10 times max health or 1000
	increasePower(n) {
		this.power = Math.min(Math.min(this.power+1,1000),Math.max(this.length*100,1000*(!game.limitedPower)));
		osc.frequency.value = 60+60*(this.power%10 == 0);
	}
	
	decreasePower(n) {
		this.power = Math.max(this.power-1,0);
		osc.frequency.value = 60+60*(this.power%10 == 0);
	}
	
	turn() {
		//mostly just keep the menu updated. input processing can't happen here
		//unless every HTML button was named, which I dont want to do.
		var menu = eid('menudiv');
		var menuhead = eid('menudivheader');
		menuhead.style.color = color(this.team);
		menuhead.innerHTML = this.name;
		//if the weapon changes, update the names of the attributes
		if (eid('regWeapon').innerHTML != weaponNames[this.weapon]) {
			eid('regWeapon').innerHTML = weaponNames[this.weapon];
			var atrN = document.getElementsByClassName('quantityDiv');
			for (var i = 0; i < 4; i++) {
				atrN[i].innerHTML = weaponProps[this.weapon][i]+':';
			}
		}
		eid('hpDiv').innerHTML = this.hp+'/'+this.mp;
		if (!game.invisibleStats) {
			eid('angleDiv').innerHTML = this.angle;
			eid('powerDiv').innerHTML = this.power;
		} else {
			eid('angleDiv').innerHTML = 'ANG';
			eid('powerDiv').innerHTML = 'POW';
		}
		if (this.points < artilleryCost()) {
			eid('pointsDiv').style.color = '#ff0000';
		} else {
			eid('pointsDiv').style.color = '#000000';
		}
		eid('pointsDiv').innerHTML = 'AP:'+this.points+'/'+artilleryCost();
		//draw weapon icon
		var icon = weaponIcons[this.weapon];
		wtx.clearRect(0,0,10,10);
		for (var i = 0; i < icon.length/2; i++) {
			wtx.fillRect(icon[i*2]+1,icon[i*2+1]+1,1,1);
		}
	}
	
	takeDamage(n,i) {
		this.hp-=n;
		if (i) {
			if (this.hp < 1 && !this.pos.includes('dead')) {
				//tell the player who killed you what they've done
				i.scoreKill(this);
				//mark that tank is dead so this code doesn't run twice
				this.pos.push('dead');
			}
		}
	}
	
	scoreKill(i) {
		if (game.earnPoints) {
			//award victim's artillery points
			this.points=Math.min(this.points+i.points,30);
		}
		if (game.rule = 'kill') {
			players[this.index].score++;
		}
	}
	
	die() {
		//choose a random death effect
		if (game.turn > tanks.indexOf(this)) {
			game.turn--;
		}
		switch (Math.floor(Math.random()*7)) {
		case 0:
			this.team = [93,93,93];
			this.draw();
			break;
		case 1:
			new explosion(this.pos, Math.floor(Math.random()*40+10), color([255,255,0]), [], this, false);
			this.undraw();
			break;
		case 2:
			new projectile(3, [this.pos[0],this.pos[1]+3], [0,0], 0, [1+Math.floor(Math.random()*5),5+Math.floor(Math.random()*8),0,2], this, false);
			this.undraw();
			break;
		case 3:
			new projectile(2, [this.pos[0],world.height-1], [0,0], 270, [2,5,1000,5], this, false);
			this.undraw();
			break;
		case 4:
			new projectile(3, [this.pos[0],this.pos[1]+3], [0,10+Math.floor(Math.random()*20)], 0, [2,Math.floor(Math.random()*6)+5,2,2], this, false);
			this.undraw();
			break;
		case 5:
			new projectile(0, [this.pos[0],this.pos[1]+3], [10-Math.floor(Math.random()*21),10+Math.floor(Math.random()*20)], 0, [3,0,0,0], this, false);
			this.undraw();
			break;
		case 6:
			new projectile(1, [this.pos[0],this.pos[1]+3], [0,0], 60+Math.floor(Math.random()*61), [2,3,3,0], this, false);
			new projectile(1, [this.pos[0],this.pos[1]+3], [0,0], 60+Math.floor(Math.random()*61), [2,3,3,0], this, false);
			new projectile(1, [this.pos[0],this.pos[1]+3], [0,0], 60+Math.floor(Math.random()*61), [2,3,3,0], this, false);
			this.undraw();
			break;
		}
		tanks.splice(tanks.indexOf(this),1);
	}
}

//shorthand
function eid(name) {
	return document.getElementById(name);
}

//easy event function
function changeWeapon(next) {
	if (game.actionable) {
		var tank = tanks[game.turn];
		if (next) {
			tank.weapon = (tank.weapon+1)%weaponNames.length;
		} else {
			tank.weapon = tank.weapon-1 + weaponNames.length*(!tank.weapon);
		}
	}	
}

//power & angle functions. These have to increase rapidly when the button held, which
//HTML doesn't natively support. So instead, when the button is pressed,
//a timer is activated that calls the function every few milliseconds.
//Since HTML doesn't have a global mouseup event, a mouseup on practically anything notable,
//including the main screen and the fire button, disables the timer immediately.

function startCounter(x) {
	endCounter();
	if (game.actionable) {
		var tank = tanks[game.turn];
		counter = setInterval(function() {
			switch (x) {
			case 0:
				tank.decreasePower(10);
				break;
			case 1:
				tank.increasePower(10);
				break;
			case 2:
				tank.decrementAngle();
				break;
			case 3:
				tank.incrementAngle();
				break;
			}
		}, 50);
	}	
}

function endCounter() {
    clearInterval(counter)
}

//calculate weapon price based on chosen attributes.
function artilleryCost() {
	var atrV = document.getElementsByClassName('quantity');
	var atr = [];
	for (i in atrV) {
		atr.push(Math.min(atrV[i].value,10));
	}
	var price = atr[0]+atr[1]+atr[2];
	if (atr[0] = 0) {price = 0;}
	return price;
}

class projectile {
	constructor(type,pos,vel,ang,atr,owner,relevant) {
		this.type = type;
		this.pos = pos;
		this.vel = vel;
		this.ang = ang;
		this.atr = atr;
		this.owner = owner;
		this.time = 0;
		this.relevant = relevant;
		this.color = color(this.owner.team);
		projectiles.push(this);
		game.actionable = false;
		switch(this.type) {
			case 0:
				if (this.atr[4]) {
					this.color = color(teams[this.atr[4]]);
				}
				break;
			case 3:
				this.color = color(teams[Math.floor(Math.random()*teams.length)])
				break;
			case 4:
				this.color = color(teams[this.atr[3]]);
		}
	}
	
	draw() {
		//get pixel position
		var pos = [Math.floor(this.pos[0])+3,world.height-Math.floor(this.pos[1])+3];
		//draw little cross
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(pos[0]-1,pos[1],3,1);
		ctx.fillRect(pos[0],pos[1]-1,1,3);
		//draw markers on projectile tracker
		ctx.fillRect(1,Math.max(Math.min(pos[1],world.height+4),1)-1,1,3);
		ctx.fillRect(world.width+4,Math.max(Math.min(pos[1],world.height+4),1)-1,1,3);
		ctx.fillRect(Math.max(Math.min(pos[0],world.width+4),1)-1,1,3,1);
		ctx.fillRect(Math.max(Math.min(pos[0],world.width+4),1)-1,world.height+4,3,1);
		ctx.fillStyle = color(this.owner.team);
		ctx.fillRect(1,Math.max(Math.min(pos[1],world.height+4),1),1,1);
		ctx.fillRect(world.width+4,Math.max(Math.min(pos[1],world.height+4),1),1,1);
		ctx.fillRect(Math.max(Math.min(pos[0],world.width+4),1),1,1,1);
		ctx.fillRect(Math.max(Math.min(pos[0],world.width+4),1),world.height+4,1,1);
	}
	
	move(trail) {
		//get the current position to the pixel
		var cpos = [Math.floor(this.pos[0]),Math.floor(this.pos[1])];
		//update real position
		this.pos[0]+=this.vel[0];
		this.pos[1]+=this.vel[1];
		//find updated position to the pixel
		var fpos = [Math.floor(this.pos[0]),Math.floor(this.pos[1])];
		//initialize trail color
		btx.fillStyle = this.color;
		ctx.fillStyle = this.color;
		//find a line from the current position to the final position
		var path = line(cpos[0],cpos[1],fpos[0],fpos[1]);
		//from start to end
		for (i in path) {
			//draw trail
			if (trail > Math.random() || game.bulletTrails) {
				btx.fillRect(Math.floor(path[i][0]),world.height-Math.floor(path[i][1]),1,1);
				if (world.walls == 'wrap') {
					btx.fillRect(Math.floor(path[i][0])+world.width,world.height-Math.floor(path[i][1]),1,1);
					btx.fillRect(Math.floor(path[i][0])-world.width,world.height-Math.floor(path[i][1]),1,1);
				}
			}
			//find if there is a color on the terrain/tank map at pixel
			var pixel = trx.getImageData(path[i][0],world.height-path[i][1],1,1).data[3];
			if (pixel) {
				//if pixel is occupied, set it to the final position
				//and return that a wall was hit
				this.pos = path[i];
				return true;
			}
		}
		//handle bullets offscreen
		if (this.pos[1] <= 1) {
			this.pos[1] == 1;
			this.explode();
		}
		if (world.ceiling && this.pos[1] > world.height) {
			switch (world.walls) {
			//concrete is simply a wall
			case 'concrete':
				this.pos[1] = world.height;
				this.explode();
				break;
			//rubber reverses y velocity, cause like, bouncy
			case 'rubber':
				this.pos[1] = world.height;
				this.vel[1]*=-1;
			}
		}
		if (this.pos[0] > world.width-1 || this.pos[0] < 0) {
			switch (world.walls) {
			//concrete is simply a wall
			case 'concrete':
				this.pos[0] = Math.max(Math.min(this.pos[0],world.width-1),0);
				this.explode();
				break;
			//wrap lets bullets... wrap
			case 'wrap':
				this.pos[0] = (this.pos[0]+world.width)%world.width;
				break;
			//rubber reverses x velocity, cause like, bouncy
			case 'rubber':
				this.pos[0] = Math.max(Math.min(this.pos[0],world.width-1),0);
				this.vel[0]*=-1;
			}
		}
		return false;
	}
	
	explode() {
		//initialize variables that depend on projectile type
		var linger = false;
		var ignore = [];
		var c = this.color;
		var r = 0;
		switch (this.type) {
		//shells explode but may bounce by toggling linger and reversing y velocity
		case 0:
			r = this.atr[0]*12;
			if (this.atr[1] > 0) {
				this.atr[1]--;
				linger = true;
				this.vel[1]*=-1;
				this.pos[1]++;
			}
			break;
		//rockets just blow up
		case 1:
			r = this.atr[0]*16;
			break;
		//fireworks split elsewhere, but otherwise just have little explosions.
		case 3:
			r = this.atr[0]*8;
			break;
		//lasers don't hurt their owner, for plasma blasts
		case 4:
			r = this.atr[0]*4;
			ignore.push(this.owner);
			break;
		}
		new explosion([Math.floor(this.pos[0]),Math.floor(this.pos[1])],r,c,ignore,this,this.relevant);
		if (!linger) {
			this.remove();
		}
	}

	remove() {
		projectiles.splice(projectiles.indexOf(this),1);
	}
	
	step() {
		var freq = 0;
		switch (this.type) {
		case 0:
			//explode on impact
			if (this.move(this.atr[3]/10)) {
				this.explode();
			} else {
				this.draw();
				freq = 400+400*Math.min(this.pos[1]/world.height,1);
			}
			//if  shell hits apex & has splits
			if (this.vel[1] < 0 && this.atr[2] > 0) {
				//make new, identical projectiles but with a fraction of the horizontal speed
				for (var i = 0; i < this.atr[2]; i++) {
					new projectile(this.type,[this.pos[0],this.pos[1]],[this.vel[0]/(this.atr[2]+1)*(i+1),this.vel[1]],this.ang,[this.atr[0],this.atr[1],0,this.atr[3]],this.owner,this.relevant);
				}
				//disable splitting
				this.atr[2] = 0;
			}
			//physics.
			this.vel[1]-=world.gravity;
			this.vel[0]*=(1-world.drag);
			this.vel[1]*=(1-world.drag);
			this.vel[0]+=(world.wind/10);
			break;
		case 1:
			//air brakes
			if (this.time == this.atr[3]*5) {
				//this.vel = [0,0];
			}
			//if time is after delay but before fuel limit plus delay
			if (this.time >= this.atr[3]*5 && this.time < this.atr[1]*5+this.atr[3]*5) {
				//drag is increased
				this.vel[0]*=Math.pow((1-world.drag),3);
				this.vel[1]*=Math.pow((1-world.drag),3);
				//increase velocity by thrust in direction of initial angle
				this.vel[0] += dummyCos(this.ang)*this.atr[2];
				this.vel[1] += dummySin(this.ang)*this.atr[2];
			}
			//explode on impact
			if (this.move()) {
				this.explode();
			} else {
				this.draw();
				freq = 400+400*Math.min(this.pos[1]/world.height,1);
				//if in rocket time
				if (this.time >= this.atr[3]*5 && this.time < this.atr[1]*5+this.atr[3]*5) {
					freq = 40+Math.random()*200;
					//calculate trail
					var smokeLine = line(Math.floor(this.pos[0]-dummyCos(this.ang)*4),Math.floor(this.pos[1]-dummySin(this.ang)*4),Math.floor(this.pos[0]-this.vel[0]-dummyCos(this.ang)*4),Math.floor(this.pos[1]-this.vel[1]-dummySin(this.ang)*4));
					btx.fillStyle = '#828282';
					for (i in smokeLine) {
						//pick random spots near or on trail for smoke effect
						var n = this.atr[2]*5;
						var mag = Math.floor(Math.random()*4);
						var ang = Math.floor(Math.random()*360);
						for (var l = 0; l < n; l++) {
							btx.fillRect(Math.floor(smokeLine[i][0]+dummyCos(ang)*mag),world.height-Math.floor(smokeLine[i][1]+dummySin(ang)*mag),1,1);
						}
					}
				}
			}
			//physics.
			this.vel[1]-=world.gravity;
			this.vel[0]*=(1-world.drag);
			this.vel[1]*=(1-world.drag);
			this.vel[0]+=(world.wind/10);
			break;
		case 2:
			//lasers consist of weak projectiles fired once every frame for the duration of the 'energy'.
			//the projectiles are unaffected by gravity, and move for a single frame for a distance determined by the length.
			//after it's single frame, a laser projectile will either have collided with something or reached the end of it's length.
			//either way, it just explodes, and the next laser projectile is fired.
			if (this.time < 12+this.atr[1]*8) {
				new projectile(4,[this.pos[0],this.pos[1]],[60*dummyCos(this.ang)*this.atr[2],60*dummySin(this.ang)*this.atr[2]],this.ang,[this.atr[0],0,0,this.atr[3]],this.owner,true);
			} else {
				this.remove();
			}
			//lasers are unaffected by physics
			break;
		case 3:
			//explode on impact, or when timer runs out
			if (this.time >= this.atr[2]*10 || this.move(this.atr[3]/10)) {
				this.explode();
				//split upon explosing, wether by fuse or by impact
				//impart random velocities within a magnitude of power
				//with random colors, the same trail and 1 power
				for (var i = 0; i < this.atr[1]; i++) {
					var ang = Math.floor(Math.random()*120)+30;
					new projectile(0,[this.pos[0],Math.max(this.pos[1],2)],[dummyCos(ang)*(4+this.atr[0]*2),dummySin(ang)*(4+this.atr[0]*2)],ang,[1,0,0,this.atr[3],Math.floor(Math.random()*teams.length)],this.owner,this.relevant);
				}
			} else {
				freq = 400+400*Math.min(this.pos[1]/world.height,1);
				this.draw();
			}
			//physics.
			this.vel[1]-=world.gravity;
			this.vel[0]*=(1-world.drag);
			this.vel[1]*=(1-world.drag);
			this.vel[0]+=(world.wind/10);
			break;
		case 4:
			this.move(true);
			this.explode();
		}
		if (freq) {
			osc.frequency.value = freq;
		}
		this.time++;
	}
}

class explosion {
	constructor(pos,r,color,ignore,owner,relevant) {
		this.pos = pos;
		this.r = r;
		this.color = color;
		this.ignore = ignore;
		this.time = 0;
		this.owner = owner;
		this.relevant = relevant;
		this.dIndex = [];
		if (r > 0) {
			explosions.push(this);
		}
		game.actionable = false;
	}
	
	step() {
		//effective radius is how long explosion has been active, increasing by 1 every frame
		//radius variable is final radius
		//is indexing coordinates instead of calling them faster? idk
		var time = this.time;
		var r = this.r;
		var cx = this.pos[0];
		var cy = this.pos[1];
		//index every pixel at every layer of the explosion at frame 1 so the computer doesn't have to calculate them every goddamn frame
		//this has a lot of overhead, but indexes are cleared as they are used and one corner is used to find the whole circle so it isnt that bad? I think?
		var index = this.dIndex;
		if (time == 0) {
			for (var x = cx-r; x <= cx; x++) {
				for (var y = cy-r; y <= cy; y++) {
					var d = Math.floor(Math.sqrt(Math.pow(cx-x,2)+Math.pow(cy-y,2)));
					if (!index[d]) {
						index[d] = [];
					}
					index[Math.floor(Math.sqrt(Math.pow(cx-x,2)+Math.pow(cy-y,2)))].push([x-cx,y-cy]);
				}
			}
		}
		this.time++;
		//expand explosion up to and including r
		if (time <= this.r) {
			//each frame, run through all pixels on the circumference of a circle that is centered on the explosion and has a radius equal to time. This causes it to expand gradually and approach r.
			for (var i = 0; i < index[time].length; i++) {
				var bx = index[time][i][0];
				var by = index[time][i][1];
				var ax = [cx+bx,cx-bx];
				var ay = [cy+by,cy-by];
				for (var v = 0; v < 2; v++) {
					for (var u = 0; u < 2; u++) {
						var x = ax[v];
						var y = ay[u];
						//fill random pixels about the explosion's radius that thins out as the explosion spreads
						//this creates a nice, smoke-like effect that both communicates the explosion well and is much quicker than filling in the explosion, making smoke or even doing the full radius.
						//it also looks super cool on laserss
						if (Math.random() < (r-time)/r) {
							//explosion starts out pure white, and approaches it's color as time approaches r.
							//this is achieved by drawing the base color and then drawing white over it with an alpha value inversely proportional to time/r.
							ctx.fillStyle = this.color;
							ctx.fillRect(x+3,world.height-y+3,1,1);
							var brightness = 'rgba(255,255,255,'+(1-Math.ceil(time/r*10)/10)+')';
							ctx.fillStyle = brightness;
							ctx.fillRect(x+3,world.height-y+3,1,1);
						}
						//this specific gray color is meant to be indestructible, i.e. tank treads and boulders.
						if (world.terrainDestruction && !colorIs(trx,x,world.height-y,[93,93,93,255])) {
							trx.clearRect(x,world.height-y,1,1);
						}
					}
				}
			}
			index[time] = false;
			//consider every tank, and if at any point along its length 
			//it is less than r away from the center, take damage.
			//tanks take more damage from being closer to the middle of explosions
			//because they are damaged once every frame for more frames
			
			//a hit tank is redrawn on the spot to prevent graphical weirdness and more importantly, to keep lasers from tunneling through them.
			for (var i in tanks) {
				if (!this.ignore.includes(tanks[i])) {
					for (var x = tanks[i].pos[0]-Math.floor(tanks[i].pixelLength()/2); x < tanks[i].pos[0]+Math.floor(tanks[i].pixelLength()/2); x++) {
						if (Math.sqrt(Math.pow(cx-x,2)+Math.pow(cy-tanks[i].pos[1]-2,2))<time) {
							tanks[i].takeDamage(1,this.owner.owner);
							tanks[i].draw();
							if (this.relevant && !game.hits.includes(tanks[i])) {
								game.hits.push(tanks[i]);
							}
							break;
						}
					}
				}
			}
			osc.frequency.value = 40+120*(this.r-this.time)/this.r;
		} else {
			this.remove();
			if (world.terrainGravity) {
				for (var x = cx-r; x <= cx+r; x++) {
					if (!world.collapsible.includes(x)) {
						world.collapsible.push(x);
					}
				}
			}
			for (i in tanks) {
				tanks[i].draw();
			}
		}
		//dont let the bottom layer get erased
		trx.fillStyle = color(world.terrainColor);
		trx.fillRect(0,world.height-1,world.width,1);
	}
	
	remove() {
		explosions.splice(explosions.indexOf(this),1);
	}
}

//lots of nice gradients
function drawBackdrop() {
	switch (world.sky) {
	case 'clear':
		// Create gradient
		var grd = ctx.createLinearGradient(0, 0, 0, world.height);
		grd.addColorStop(0, "#8080ff");
		grd.addColorStop(1, "#a7b4d4");
		
		// Fill with gradient
		btx.fillStyle = grd;
		btx.fillRect(0, 0, world.width, world.height);
		break;
	case 'sunset':
		// Create gradient
		var grd = ctx.createLinearGradient(0, 0, 0, world.height);
		grd.addColorStop(0.05, "#a7b4d4");
		grd.addColorStop(0.3, "#ff00ff");
		grd.addColorStop(0.6, "#ff9e00");
		grd.addColorStop(1, "#ff0000");
		
		// Fill with gradient
		btx.fillStyle = grd;
		btx.fillRect(0, 0, world.width, world.height);
		
		//draw big 'ol sun
		btx.fillStyle = '#ffff00';
		btx.beginPath();
		btx.arc(world.width/2,world.height*1.5, world.width/2, 0, 2 * Math.PI);
		btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();btx.fill();
		break;
	case 'night':
		// Create gradient
		var sgrd = ctx.createLinearGradient(0, 0, 0, world.height);
		sgrd.addColorStop(0, "#828282");
		sgrd.addColorStop(0.25, "#ffffff");
		sgrd.addColorStop(1, "#102090");
		
		var grd = ctx.createLinearGradient(0, 0, 0, world.height);
		grd.addColorStop(0, "#000000");
		grd.addColorStop(1, "#001080");
		
		// Fill with gradient
		btx.fillStyle = grd;
		btx.fillRect(0, 0, world.width, world.height);
		
		// Fill side with gradient
		btx.fillStyle = sgrd;
		btx.fillRect(0, 0, 1, world.height);
		
		// dot stars
		for (var i = 0; i < world.width*world.height/500; i++) {
			var y = Math.floor(Math.random()*world.height);
			var color = btx.getImageData(0,y,1,1).data;
			btx.fillStyle = "rgb("+color[0]+","+color[1]+","+color[2]+")";
			btx.fillRect(Math.floor(Math.random()*world.width),y,1,1);
		}
		
		// Fill side with gradient
		btx.fillStyle = grd;
		btx.fillRect(0, 0, 1, world.height);
		break;
	}
}

//border & shot tracker
function drawOverlay() {
	ctx.fillStyle = '#e2e2e2';
	ctx.fillRect(0,0,ccc.width,ccc.height);
	ctx.clearRect(1,1,ccc.width-2,ccc.height-2);
	switch (world.walls) {
	case 'concrete':
		ctx.fillStyle = '#828282';
		break;
	case 'rubber':
		ctx.fillStyle = '#ff80ff';
		break;
	case 'wrap':
		ctx.fillStyle = '#a7b4d4';
		break;
	}
	ctx.fillRect(2,2,ccc.width-4,ccc.height-4);
	ctx.clearRect(3,3,ccc.width-6,ccc.height-6);
}

//generate string based on who fired, what they fired, and who they hit
function report() {
	var hitType = 0;
	//init tank
	var tank = tanks[((game.turn-1)+tanks.length)%tanks.length];
	//init string
	var hitString = '';
	game.hits.splice(game.hits.indexOf('relevant'),1);
	//report nobody if game.hits length is 0
	if (!game.hits.length) {
		hitString = 'nobody';
	}
	//add each name in game.hits to the string
	//if its the owner of the shot, add 'themself'
	//add a comma or 'and' at the front if its in the middle or last
	for (var i in game.hits) {
		if (game.hits[i] == tank) {
			var hit = 'themself';
			hitType = Number.NEGATIVE_INFINITY;
		} else {
			var hit = game.hits[i].name;
			hitType++;
		}
		if (i > 0 && i < game.hits.length-1) {
			var connector = ', ';
		} else if (i == game.hits.length-1 && game.hits.length > 1) {
			var connector = ' and ';
		} else {
			var connector = '';
		}
		hitString+=connector+hit;
	}
	if (hitType < 0) {
		hitString = hitTerms[Math.floor(Math.random()*hitTerms.length)]+hitString;
	} else if (hitType == 0) {
		hitString = missTerms[Math.floor(Math.random()*missTerms.length)];
	} else if (hitType == 1) {
		hitString = hitTerms[Math.floor(Math.random()*hitTerms.length)]+hitString;
	} else if (hitType > 1) {
		hitString = hitTerms[Math.floor(Math.random()*hitTerms.length)]+hitString;
	}
	//piece together string
	var str = tank.name+' fired a '+weaponNames[tank.weapon]+' and '+hitString+'.';
	//update report window
	eid("dialogdivheader").innerHTML = str;
}

//uses steps & slopes to generate nice mounds
//note that terrain is actually only stored in the canvas itself,
//which saves a ton of memory for big battlefields
function generateTerrain() {
	trx.fillStyle = color(world.terrainColor);
	if (generator.cavern) {
		var median = Math.floor(Math.random()*world.height/5+world.height/6);
		var max = Math.floor(world.height*2/5);
	} else {
		var median = Math.floor(Math.random()*world.height/2+world.height/6);
		var max = Math.floor(world.height*3/4);
	}
	var step = [median,0,1];
	var heights = [];
	for (var i = 0; i < world.width; i++) {
		step = generateStep(step,max);
		heights.push(step[0]);
		trx.fillRect(i,trc.height-Math.floor(step[0]),1,Math.floor(step[0]));
	}
	//cavern mode simply generates a second terrain and sticks it on top instead
	if (generator.cavern) {
		var step = [median,0,1];
		for (var i = 0; i < world.width; i++) {
			step = generateStep(step,max);
			trx.fillRect(i,0,1,Math.floor(step[0]));
		}	
	}
	var structs = [];
	if (generator.trees) {
		structs.push('tree');
	}
	if (generator.rocks) {
		structs.push('rock');
	}
	if (generator.structures) {
		structs.push('nest');
		structs.push('wall');
		structs.push('bridge');
	}
	if (structs.length != 0) {
		for (var i = 0; i < world.width; i++) {
			if (Math.random() < generator.population) {
				var s = structs[Math.floor(Math.random()*structs.length)];
				switch (s) {
				case 'tree':
					var height = Math.floor(generator.structureSize*15+Math.random()*generator.structureSize*10);
					var base = heights[i];
					var absHeight = Math.floor(base+height);
					trx.fillStyle = 'brown';
					for (var x = 0; x < Math.ceil(height/10); x++) {
						trx.fillRect(i+x,world.height-absHeight+6,1,Math.abs(absHeight-Math.floor(heights[i+x]))-5);
					}
					var x = i+Math.ceil(height/20);
					var branch = [];
					for (var y = world.height-absHeight; y < world.height-base-height/4; y++) {
						//if (Math.random()<0.5) {
						//	branch = branch.concat(line(x-(y-(world.height-absHeight))/3*2,Math.floor(y+Math.random()*(y-(world.height-absHeight))),x+Math.ceil(height/10),y));
						//} else {
						//	branch = branch.concat(line(x+Math.ceil(height/10)+(y-(world.height-absHeight))/3*2,Math.floor(y+Math.random()*(y-(world.height-absHeight))),x,y));
						//}
						var offset = -1+Math.floor(Math.random()*3);
						branch = branch.concat(line(x-(y-(world.height-absHeight))/3+offset,y,x+(y-(world.height-absHeight))/3+offset,y));
					}
					trx.fillStyle = 'green';
					for (var l in branch) {
						trx.fillRect(Math.floor(branch[l][0]),Math.floor(branch[l][1]),1,1);
					}
					i+=Math.ceil(generator.structureSize*20);
					break;
				case 'rock':
					var cx = i;
					var cy = Math.floor(heights[i]);
					var n = Math.floor(Math.random()*7)+6;
					var angle = Math.floor(Math.random()*15);
					var size = 2*generator.structureSize+Math.random()*2*generator.structureSize;
					var points = [];
					for (var l = 0; l < n; l++) {
						var mag = Math.floor(2*size+Math.random()*size);
						points.push([cx+Math.floor(dummyCos(angle)*mag),cy+Math.floor(dummySin(angle)*mag)]);
						angle+=365/n;
					}
					var outline = [];
					for (var l = 0; l < n; l++) {
						outline = outline.concat(line(points[l][0],points[l][1],points[(l+1)%points.length][0],points[(l+1)%points.length][1]));
					}
					trx.fillStyle = '#5d5d5d';
					var widths = [];
					for (var y = 0; y <= Math.floor(size*6); y++) {
						widths[y] = 2;
					}
					for (var l in outline) {
						var width = widths[outline[l][1]-cy+Math.floor(size*3)];
						if (width == 2) {
							widths[outline[l][1]-cy+Math.floor(size*3)] = [outline[l][0],outline[l][0]];
						} else {
							if (width[0] > outline[l][0]) {
								widths[outline[l][1]-cy+Math.floor(size*3)][0] = outline[l][0];
							}
							if (width[1] < outline[l][0]) {
								widths[outline[l][1]-cy+Math.floor(size*3)][1] = outline[l][0];
							}
						}
					}
					for (var y = 0; y < widths.length; y++) {
						if (widths[y].length == 2) {
							trx.fillRect(widths[y][0],y+(world.height-cy)-Math.floor(size*2),widths[y][1]-widths[y][0],1);
						}
					}
					i+=Math.ceil(generator.structureSize*20);
				}
			}
		}
	}
}	
		
function generateStep([cHeight,cRise,cSprawl],max) {
	cHeight = Math.min(Math.max(cHeight+cRise,1),max);
	cSprawl--;
	if (cSprawl == 0) {
		cSprawl = Math.round(generator.sprawl*(Math.random()*0.5+0.75));
		cRise = Math.random()*generator.rise - generator.rise/2;
		if (Math.abs(cRise) < generator.rise/10) {
			cRise = 0;
		}
	}
	return [cHeight,cRise,cSprawl];
}  

//trigonometric functions that work with degrees, which are for dummies like me
function dummySin(x) {
	return Math.sin(x * Math.PI / 180);
}
	
function dummyCos(x) {
	return Math.cos(x * Math.PI / 180);
}

function endOfTurn() {
	//report relevant hits
	if (game.hits.includes('relevant')) {
		report();
	}
	//clear hits
	game.hits = [];
	//kill dead tanks. Points for kills aren't handled here, just death effects and remarks.
	var died = [];
	for (var i = 0; i < tanks.length; i++) {
		if (tanks[i].hp < 1) {
			died.push(tanks[i].name);
			tanks[i].die();
			i = -1;
		}
	}
	if (died.length) {
		var diedString = '';
		for (var i in died) {
			if (i > 0 && i < died.length-1) {
				var connector = ', ';
			} else if (i == died.length-1 && died.length > 1) {
				var connector = ' and ';
			} else {
				var connector = '';
			}
			diedString+=connector+died[i];
		}
		eid("dialogdivheader").innerHTML = diedString+dieTerms[Math.floor(Math.random()*dieTerms.length)];
	}
	//update wind
	world.wind+=Math.max(Math.min((Math.random()*world.windVariance)-world.windVariance/2,world.windVariance*30),world.windVariance*-30);
	updateWind();
	//collapse terrain
	collapseTerrain(world.collapsible);
	world.collapsible = [];
	//let tanks move
	game.actionable = true;
}

function endGame(winner) {
	trx.clearRect(0,0,world.width,world.height);
	ctx.clearRect(0,0,world.width+6,world.height+6);
	btx.clearRect(0,0,world.width,world.height);
	osc.stop();
	osc = false;
	atx = false;
	window.clearInterval(round);
	if (winner) {
		console.log(tanks[0].name+' won it');
	} else {
		console.log('a tie. you all suck!');
	}
	eid('menudiv').style.display = 'none';
	eid('scorediv').style.display = 'none';
	eid('dialogdiv').style.display = 'none';
	eid('bgCanvas').style.display = 'none';
	eid('trCanvas').style.display = 'none';
	eid('clickCanvas').style.display = 'none';
	eid('startButton').style.display = 'block'
	round = false;
}

function roundLoop() {
	drawOverlay();
	if (game.turn >= tanks.length) {
		game.turn = 0;
	}

	for (i in tanks) {
		tanks[i].settle();
	}
	
	//make players inactionable while projectiles and explosions are active
	//then initiate end of turn sequence, where tanks are redrawn, die and report is made
	//make buttons inactionable during projectile flights and explosions
	osc.frequency.value = 0;
	
    if (explosions.length || projectiles.length) {
		endCounter();
		for (i in projectiles) {
			projectiles[i].step();
		}
		for (i in explosions) {
			explosions[i].step();
		}
	} else {
		if (!game.actionable) {
			endOfTurn();
		}
	}
	
	if (game.actionable && tanks.length) {
		tanks[game.turn].turn();
	}
	
	//only end game after explosions are done
	if (game.actionable && tanks.length == 1) {
		endGame(tanks[0]);
	} else if (game.actionable && tanks.length == 0) {
		endGame(false);
	}
	
	if (game.actionable) {
		turnArrow(tanks[game.turn]);
	}
	
	//update players list
	
	//scale menus inversely of zoom
	if (2/window.devicePixelRatio != eid("menudiv").style.zoom) {
		var x = document.getElementsByClassName("dragdiv");
		for (i in x) {
			try {
				x[i].style.zoom = 2/window.devicePixelRatio;
			} catch(e) {
				1+2;
			}
		}
	}
}

function turnArrow(tank) {
	var x = tank.pos[0]+3;
	var y = world.height-tank.pos[1]-6;
	ctx.fillStyle = color(tank.team);
	ctx.fillRect(x-3,y-8,7,2);
	ctx.fillRect(x-2,y-6,5,1);
	ctx.fillRect(x-1,y-5,3,1);
	ctx.fillRect(x,y-4,1,1);
}

function updateWind() {
	var string = "Wind:"
	var wind = Math.round(world.wind*10);
	if (wind < 0) {
		string+='<-'+Math.ceil(Math.abs(wind))+'  ';
	} else if (wind > 0) {
		string+='  '+Math.ceil(wind)+'->';
	} else {
		string+='  0  ';
	}
	eid('windDiv').innerHTML = string;
}

function collapseTerrain(collapse) {
	var tc = world.terrainColor;
	trx.fillStyle = color(tc);
	tc.push(255);
	for (var ci = 0; ci <= collapse.length; ci++) {
		var x = collapse[ci];
		if (x >= 0 && x < world.width) {
			var limit = world.height;
			while (colorIs(trx,x,world.height-limit,tc)) {
				limit--;
			}
			var anchor = 1;
			var count = 0;
			for (var i = 0; i < limit; i++) {
				var ai = world.height-i;
				if (colorIs(trx,x,ai,tc)) {
					count++;
				} else if (trx.getImageData(x,ai,1,1).data[3] || i == limit-1) {
					trx.clearRect(x,ai+1,1,i-anchor);
					trx.fillRect(x,world.height-anchor-count+1,1,count);
					anchor = i+1;
					count = 0;
				}
			}
		}
	}
}

window.addEventListener('keydown', this.inp, false);
window.addEventListener('keyup', this.inpt, false);

//keyboard controls
function inp(event) {
	endCounter();
	var k = event.keyCode;
	if (game.actionable) {
		key(k);
	}
}
	
function inpt(event) {
	endCounter();
    var k = event.key;
}

function key(k) {
	if (round) {
		var tank = tanks[game.turn];
		if (game.actionable) {
			switch (k) {
			case 40:
				tank.decreasePower(1);
				break;
			case 38:
				tank.increasePower(1);
				break;
			case 37:
				tank.decrementAngle();
				break;
			case 39:
				tank.incrementAngle();
				break;
			case 13:
			case 32:
				tank.fire();
				break;
			case 188:
			case 190:
				tank.move(k-189);
				break
			case 16:
				changeWeapon(1);
				break;
			case 49:
			case 50:
			case 51:
			case 52:
				document.getElementsByClassName('quantity')[k-49].value = (Number(document.getElementsByClassName('quantity')[k-49].value)+1)%11;
				break;
			case 97:
			case 98:
			case 99:
			case 100:
				document.getElementsByClassName('quantity')[k-97].value = (Number(document.getElementsByClassName('quantity')[k-97].value)+1)%11;
				break;
			}
		}
	}
}

var clicking = false;
	
var mpos = [0,0];
	
function mclick(event) {
	mpos = getMousePos(event);
	
	clicking = true;
	
	if (round) {
		if (mpos[2] == 2) {
			trx.clearRect(mpos[0]+3,0,1,Math.min(mpos[1]+3,world.height-1));
			for (i in tanks) {
				tanks[i].draw();
			}
		} else if (mpos[2] == 1) {
			trx.fillStyle = color(world.terrainColor);
			trx.fillRect(mpos[0]+3,mpos[1]+3,1,world.height-mpos[1]+3);
			for (i in tanks) {
				tanks[i].draw();
			}
		} else if (mpos[2] == 4) {
			tanks[game.turn].undraw();
			tanks[game.turn].pos[0] = mpos[0];
			tanks[game.turn].pos[1] = world.height-mpos[1];
			tanks[game.turn].draw();
		}
	}
}
	
function mdrag(event) {
	var lmpos = [];
	lmpos[0] = mpos[0];
	lmpos[1] = mpos[1];
	mpos = getMousePos(event);
		
	if (round) {
		if (clicking) {
			if (mpos[2] == 2) {
				var slope = line(mpos[0]+3,mpos[1]+3,lmpos[0]+3,lmpos[1]+3);
				for (var i in slope) {
					trx.clearRect(slope[i][0],0,1,Math.min(world.height-1,slope[i][1]));
				}
				for (i in tanks) {
					tanks[i].draw();
				}
			} else if (mpos[2] == 1) {
				trx.fillStyle = color(world.terrainColor);
				var slope = line(mpos[0]+3,mpos[1]+3,lmpos[0]+3,lmpos[1]+3);
				for (var i in slope) {
					trx.fillRect(slope[i][0],slope[i][1],1,world.height-slope[i][1]);
				}
				for (i in tanks) {
					tanks[i].draw();
				}
			}
		}
	}
}

function mrelease(event) {
	endCounter();
	mpos = getMousePos(event);
	
	clicking = false;
		
	
}

function mheld() {
	
}

function getMousePos(evt) {
	var rect = evt.path[0].getBoundingClientRect();
	return [
		Math.floor(evt.offsetX-6),
		Math.floor(evt.offsetY-6),
		evt.buttons
	];
}

function startGame() {
	//initialize game size
	trc.width = window.innerWidth-6;
	trc.height = window.innerHeight-6;
	bgc.width = window.innerWidth-6;
	bgc.height = window.innerHeight-6;
	ccc.width = window.innerWidth;
	ccc.height = window.innerHeight;
	world.width = trc.width;
	world.height = trc.height;
	//initialize global lists
	tanks = [];
	projectiles = [];
	explosions = [];
	game.turn = 0;
	updateWind();
	//initialize sounds
	atx = new (window.AudioContext || window.webkitAudioContext)();
	osc = atx.createOscillator();
	osc.type = 'triangle';
	osc.frequency.value = 0;
	osc.connect(atx.destination);
	osc.start();
	//report game start
	eid('dialogdivheader').innerHTML = startRemarks[Math.floor(Math.random()*startRemarks.length)];
	var side = 0;
	//generate tanks based on list of players
	for (var i in players) {
		var p = players[i];
		p.score = 0;
		new tank(p.name, p.style, p.mobile, p.length, teams[p.team], [Math.floor(Math.random()*(world.width/2-10)+5+(world.width/2*(side%2))),world.height-Math.floor(world.height*generator.cavern/2)], p.points, p.brain);
		side++;
	}
	//draw background and stuff
	var rains = [];
	for (var i = 0; i < 128; i++) {
		rains.push(Math.floor(Math.random()*6)+2);
	}
	world.rains = rains;
	drawBackdrop();
	generateTerrain();
	//fire game frame loop
	round = window.setInterval(roundLoop,game.delay);
	//show game windows, hide menu windows
	eid('menudiv').style.display = 'block';
	eid('scorediv').style.display = 'block';
	eid('dialogdiv').style.display = 'block';
	eid('bgCanvas').style.display = 'block';
	eid('trCanvas').style.display = 'block';
	eid('clickCanvas').style.display = 'block';
	eid('startButton').style.display = 'none';
}
