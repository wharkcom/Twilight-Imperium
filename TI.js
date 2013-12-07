//Global variables
var images = {}; //Normal images of all hexes
var kImages = []; //Kinetic images for all hexes
var players = []; //Array of all players
var tile = []; //Array of all tiles
var stratCards = []; //Array of all Strategy Cards
var numPlayers = 4; //Number of players in the game
var tilesPerPlayer = 36/numPlayers-1; //Number of tiles for each player
var scalefactor = 6.5; //Scale amount for hex size
var hexWidth, hexHeight, bOff; //Hex sizes, offset for drawing board
var stage;
var layer = new Kinetic.Layer(); //Layer that holds the board
var topLayer = new Kinetic.Layer(); //Layer to show expanded tiles
var backgroundLayer = new Kinetic.Layer(); //Background
var layerPlayerTiles = new Kinetic.Layer(); //Player tiles during placement
var layerPlayerTilesTop = new Kinetic.Layer(); //Expanded player tiles
var layerStatus = new Kinetic.Layer(); //Game Phase or other info
var layerStratCards = new Kinetic.Layer(); //Layer for Strategy Cards
var rect; //Background rectangle
var board, homes;
var group = new Kinetic.Group();
//var groupPlayerTiles = new Kinetic.Group();
var selectedNode, targetNode; //Used to pass tiles between layers
var gameState = new GameState(4);
var boardCount = 0;
var strategyCardButton = new GameButton('Show Strategy Cards', 8, 760, 30);
var showBoardButton = new GameButton('Show Game Board', 8, 760, 30);
var testButtonDraw = new GameButton('Test Draw', 600, 760, 30);
var testButtonHide = new GameButton('Test Hide', 750, 760, 30);
var selectSC = new GameButton('Select Card', 300, 760, 30);


function init() {
	//Initiate stage
	stage = new Kinetic.Stage({
		container: 'container',
		width: 1000,
		height: 800,
	});

	//Define hex sizes based on stage size
	hexWidth = stage.attrs.height/scalefactor;
	hexHeight = hexWidth*images.blank.height/images.blank.width;
	bOff = stage.attrs.height/2-10;

	//Setup game
 	drawBackground();
 	createBoard();
 	createPlayers();
 	assignTiles();
 	loadCards();
 	gameControl();
 	phase('Board Setup');
 	hideStrategyCards();

 	//Extra buttons to facilitate testing
 	drawButton(testButtonDraw, testFunctionDraw);
 	drawButton(testButtonHide, testFunctionHide);

 	//Click events
	topLayer.on('click', resetExpand);
	layer.on('click', expandTile);

	//Add all of the layers to the stage
	stage.add(backgroundLayer);
	stage.add(layer);
	stage.add(layerStatus);
	stage.add(layerPlayerTiles);
	stage.add(layerPlayerTilesTop);
	stage.add(topLayer);
	stage.draw();
}

function gameControl() {
	for(i=0; i<numPlayers; i++){
		players[i].turn = i+1;
	}

	gameState.currentPlayer = players[0];
	updateStatus('It is your turn, Player '+(gameState.currentPlayer.num), true);
	turn('Player '+gameState.currentPlayer.num);

	drawPlayerTiles()

	//updateStatus('Board is complete!', true);
}

function GameState(numPlayers) {
	this.playerTurn = 1;
	this.numPlayers = numPlayers;
	this.currentPlayer;
	this.direction = true; //Used for turn order while building board
	this.phase;
	this.board;

	//Special NextTurn function for building the game board
	this.createBoardNextTurn = function() {
		if(this.direction){
			this.playerTurn += 1;
			if(this.playerTurn>this.numPlayers){ //Switch direction once the last player goes
				this.direction = false;
				this.playerTurn = this.numPlayers;
			}
		} else{
			this.playerTurn -=1;
			if(this.playerTurn<1){ //Switch direction
				this.direction = true;
				this.playerTurn = 1;
			}
		}
		for(i=0; i<this.numPlayers; i++){
			if(players[i].turn==this.playerTurn){
				this.currentPlayer = players[i];
				break;
			}
		}
		updateStatus('It is your turn, Player '+(this.currentPlayer.num), true);
		turn('Player '+this.currentPlayer.num);
	}

	//Standard nextTurn function
	this.nextTurn = function() {
		if(this.playerTurn < this.numPlayers) {
			this.playerTurn += 1;
		} else {
			this.playerTurn = 1;
		}
		for(i=0; i<this.numPlayers; i++){
			if(players[i].turn==this.playerTurn){
				this.currentPlayer = players[i];
				break;
			}
		}
		updateStatus('It is your turn, Player '+(this.currentPlayer.num), true);
		turn('Player '+this.currentPlayer.num);
	}
}

function strategyPhase() {
	phase('Strategy Phase');
	//Draw button
	drawButton(strategyCardButton, showStrategyCardsButton);
}

/*******************
Click Events
*******************/

//Click event for board layer (Show enlarged tiles)
function expandTile(evt) {
	var node = evt.targetNode.clone({
		width: hexWidth*3,
		height: hexHeight*3,
		x: stage.attrs.height/2-hexWidth*3/2,
		y: stage.attrs.height/2-hexHeight*3/2,
	});

	node.moveTo(topLayer);
	topLayer.draw();
	layer.off('click');

	//Testing clearing board
	layer.clear();


    console.log('Filled: '+evt.targetNode.attrs.filled);
    console.log('Dist: '+evt.targetNode.attrs.distance);

    updateStatus('Col, Row: ('+tile[evt.targetNode.index].col+', '+tile[evt.targetNode.index].row+'); Index: '+evt.targetNode.index, true);
}

//Click event for top layer (shows enlarged hexes)
function resetExpand(evt) {
	var node = evt.targetNode;
	node.remove();
    topLayer.draw();
	layer.on('click', expandTile);

	//Redraw board
	layer.draw();
}

//Select a player tile to place on the board
function selectToPlace(evt) {
	layer.off('click')
	selectedNode = evt.targetNode;

	//Set clicked tile to globals to pass to the board
	if(selectedNode.attrs.image){

		//Enlarge selected node
		var node = evt.targetNode.clone({
			x: 5/8*stage.attrs.width+10,
			y: 5,
			width: hexWidth*2,
			height: hexHeight*2,
		});

		node.moveTo(layerPlayerTilesTop);
		layerPlayerTilesTop.draw();
		
		//Activate stage to place
		layer.on('click', assignTile);
	} else {
		updateStatus('That is not a valid tile',true);
	}
}

//Select a location to place the player tile
function assignTile(evt) {
	var node = evt.targetNode;

	if(node.attrs.filled){
		updateStatus('That is not a valid location', true)
	} else {
		if(boardCount<6 && distance(0,0,tile[node.index].col,tile[node.index].row)==1){
			placeTile(node);
			boardCount++;
		} else

		if(boardCount>5 && boardCount<18 && distance(0,0,tile[node.index].col,tile[node.index].row)==2){
			placeTile(node);
			boardCount++
		} else

		if(boardCount>17 && distance(0,0,tile[node.index].col,tile[node.index].row)==3){
			placeTile(node);
			boardCount++
		} else {
			updateStatus('That is not a valid location', true);
		}
	}

	//Start next phase when board setup is complete
	if(boardCount==1){
		updateStatus('Board Complete!', true);
		strategyPhase();
	}	
}

//Button function to hide the board and show Strategy cards
function showStrategyCardsButton() {
	hideButton(strategyCardButton);
	hideBoard();
	showStrategyCards();
	drawButton(showBoardButton, showBoard);

	//Clear extra tiles (for testing)
	layerPlayerTiles.hide();

}

//Button function to hide Strategy cards and show the board
function showBoard() {
	hideButton(showBoardButton);
	drawBoard();
	hideStrategyCards();
	drawButton(strategyCardButton, showStrategyCardsButton);

	//Show extra tiles (for testing)
	layerPlayerTiles.show();
}

//Function for testing purposes -- attempting to save game state atm
function testFunctionDraw() {
	console.log(gameState);
	var cache = [];
	JSON.stringify(gameState, function(key, value) {
		if(typeof value === 'object' && value !== null){
			if(cache.indexOf(value) !== -1){
				return;
			}
			cache.push(value);
		}
		return value;
	});
	cache=null;
	console.log('test');
}

//Function for testing purposes
function testFunctionHide() {
	//showBoard();
	//hideStrategyCards();
	console.log('Test hide');
}

/*******************
Image Loading Stuff
*******************/

//Load image files before starting game. **Can probably make this more efficient
function loadImages(sources, callback) {  
	var loadedImages = 0;
	var numImages = 0;
	// get num of sources
	for(var src in sources) {
		numImages++;
	}
	for(var src in sources) {
		images[src] = new Image();
		images[src].onload = function() {
			if(++loadedImages >= numImages) {
				callback();
			}
		};
		//images[src].crossOrigin = '';
		images[src].src = sources[src];
	};
	updateStatus('Images Loaded', true);
}

//List of images for the game
var sources = {
	orange: 'hexes/hex4.png',
	lightBlue: 'hexes/hex1.png',
	green: 'hexes/hex2.png',
	pink: 'hexes/hex3.png',
	red: 'hexes/hex5.png',
	blue: 'hexes/hex6.png',
	blank: 'hexes/blank.png',
	blankHigh: 'hexes/blankHighlight.png',
	home1: 'hexes/home1.png',
	home2: 'hexes/home2.png',
	home3: 'hexes/home3.png',
	home4: 'hexes/home4.png',
	home5: 'hexes/home5.png',
	home6: 'hexes/home6.png',
	mecatol: 'hexes/mecatol.png',
	strat1: 'strat_cards/1_active.png',
	strat2: 'strat_cards/2_active.png',
	strat3: 'strat_cards/3_active.png',
	strat4: 'strat_cards/4_active.png',
	strat5: 'strat_cards/5_active.png',
	strat6: 'strat_cards/6_active.png',
	strat7: 'strat_cards/7_active.png',
	strat8: 'strat_cards/8_active.png',
};

/*******************
Make the board
*******************/


//Creates a colored rectangle as the background for the game
function drawBackground() {
	rect = new Kinetic.Rect({
        width: stage.attrs.width,
        height: stage.attrs.height,
        fill: 'grey',
        stroke: 'black',
        strokeWidth: 4
    });

	// add the shape to the layer
	backgroundLayer.add(rect);
}

//Initializes a new Kinetic.Image() for each tile
function createBoard() {
	makeArray();
	for(i=0; i<board.length; i++) { //Loop through all hexes
		col = board[i].x;
		row = board[i].y;

 		tile[i] = new Tile();
		tile[i].image = new Kinetic.Image({ 
			//Create new image with appropriate location
			x: (bOff-hexWidth/2)+0.75*hexWidth*col,
			y: (bOff-hexHeight/2)+(0.5*hexHeight*col-hexHeight*row),
			width: hexWidth,
			height: hexHeight,
			image: images.blank,
			filled: false, //Has the hex been filled with a real tile?
			distance: null,
		});
		tile[i].col = col;
		tile[i].row = row;

		//Set the center tile to Mecatol Rex and assigns distances from the center
		if(distance(0,0,tile[i].col,tile[i].row)==0){
			tile[i].image.attrs.image = images.mecatol;
			tile[i].image.attrs.filled = true;
			tile[i].image.attrs.distance = 0;
		} else
		if(distance(0,0,tile[i].col,tile[i].row)==1){
			tile[i].image.attrs.distance = 1;
		} else
		if(distance(0,0,tile[i].col,tile[i].row)==2){
			tile[i].image.attrs.distance = 2;
		} else
		if(distance(0,0,tile[i].col,tile[i].row)==3){
			tile[i].image.attrs.distance = 3;
		} 

		group.add(tile[i].image);
	}
	gameState.board = tile;
	console.log(gameState);
	layer.add(group);
	updateStatus('Board drawn', true);

	//Array containing X and Y positions for board tiles
	function makeArray() {
		board = new Array(37);
		i = 0;

		for ( var x = -3; x <= 3; x++ ) {
			if ( x <= 0 ) {
				starty = -3;
				endy = 3 + x
			} else {
				starty = x - 3;
				endy = 3;
			}
			for ( var y = starty; y <= endy; y++) {

				board[i] = new Hex(x, y);
				i++;
			}
		}
	}
}

//Highlight tiles based on distance (dist) from the center. Used when players are placing tiles to highlight valid locations
function colorByDist(dist) {
	for(i=0; i<tile.length; i++){
		if(distance(0,0,tile[i].col,tile[i].row)==dist){
			tile[i].image.attrs.image = images.blankHigh;
		} 	
	}
}

//Define home tile positions based on number of players (4-6)
function makeHomeTiles() {
	homes = new Array(numPlayers);

	if(numPlayers==6){
		homes[0] = new Hex(0,3);
		homes[1] = new Hex(3,3);
		homes[2] = new Hex(3,0);
		homes[3] = new Hex(0,-3);
		homes[4] = new Hex(-3,-3);
		homes[5] = new Hex(-3,0);
	} 
	else if(numPlayers==5){
		homes[0] = new Hex(0,3);
		homes[1] = new Hex(3,3);
		homes[2] = new Hex(2,-1);
		homes[3] = new Hex(-2,-3);
		homes[4] = new Hex(-3,0);
	} 
	else if(numPlayers==4){
		homes[0] = new Hex(2,3);
		homes[1] = new Hex(2,-1);
		homes[2] = new Hex(-2,-3);
		homes[3] = new Hex(-2,1);
	}
}

//Update home tile images once players are initialized
function updateHomeTiles() {
	for(p=0; p<players.length; p++){
		for(i=0; i<tile.length; i++){
			if(tile[i].col==players[p].homeX && tile[i].row==players[p].homeY){
				tile[i].image.attrs.image = players[p].homeTile;
				tile[i].image.attrs.filled = true;
			}
		}
	}
}

//Calculate the distance between two hexes
function distance(x1, y1, x2, y2) {
	var dist = (Math.abs(x2-x1)+Math.abs(y2-y1)+Math.abs((x2-x1)-(y2-y1)))/2;
	return dist;
}

function placeTile(node) {
	//Update board with new tile image, set filled
	tile[node.index].image.attrs.filled = true;
	tile[node.index].image.attrs.image = selectedNode.attrs.image;
	
	//Remove selected node from player set
	gameState.currentPlayer.tiles[selectedNode.index] = null;
	layerPlayerTiles.draw();

	//Remove enlarged tile once placed
	layerPlayerTilesTop.removeChildren();
	layerPlayerTilesTop.draw();

	updateStatus('Tile placed!', true);
	layer.draw();
	layer.off('click');

	gameState.createBoardNextTurn();

	layerPlayerTiles.off('click'); //Resets clicks for Player Tiles Layer

	//Clear last player's tiles
	layerPlayerTiles.removeChildren();
	layerPlayerTiles.draw();

	//Draw current player's tiles, reactivate clicks
	drawPlayerTiles();
}

//Creates an array of strategy card images
function loadCards(){
	for(i=1; i<9; i++){
		stratCards[i-1] = new StratCard(i);
		stratCards[i-1].active = true;

		stratCards[i-1].image = new Kinetic.Image({
			image: images['strat'+i],
			width: 250,
			height: 300,
			x: i<5 ? 25 + (i-1)*205: 25 + (i-5)*205,
			y: i<5 ? 50 : 400,

		});

		layer.add(stratCards[i-1].image);
	}
}

//Draws all board hex images in Tile array
function drawBoard() {
	for(i=0; i<tile.length; i++){
		tile[i].image.show();
	}
	layer.draw();
}

//Hides all board hex images in Tile array
function hideBoard() {
	for(i=0; i<tile.length; i++){
		tile[i].image.hide();
	}
	layer.draw();
}

//Displays the strategy cards
function showStrategyCards() {
	//Are we still in the Strategy Phase? 
	//***** Need to fix this -- not sure how yet
	if(!gameState.currentPlayer.sc1 && !gameState.currentPlayer.sc2){
		console.log('Not done with Strategy');
	} else {
		console.log('Done with Strategy');
	}
	//Loop to display the individual cards *** Need to use this strategy for other parts of code!
	for(i=0; i<stratCards.length; i++) {
		if(stratCards[i].active) {
			stratCards[i].image.show();
			stratCards[i].image.on('click', enlargeSC);
		}
	}
	layer.draw();

}

//Hides strategy card images
function hideStrategyCards() {
	for(i=0; i<stratCards.length; i++) {
		stratCards[i].image.hide();
		stratCards[i].image.off('click');
	}
	layer.draw();
}

//Enlarge strategy card for easier viewing/reading
function enlargeSC(evt) {
	var node = evt.targetNode;

	console.log(gameState.currentPlayer);

	for(i=0; i<stratCards.length; i++) {
		stratCards[i].image.hide();
		stratCards[i].image.off('click');
	}
	//Creates a new variable to store the card rather than altering the original
	var tempCard = new Kinetic.Image({
		image: stratCards[node.index-1].image.attrs.image,
		x: 250,
		y: 50,
		width: 500,
		height: 600,
	});
	layer.add(tempCard);
	tempCard.on('click', shrinkSC);

	//Delete the temp card
	function shrinkSC() {
		tempCard.remove();
		layer.draw();
		hideButton(selectSC);
		showStrategyCards();
	}
	layer.draw();
	drawButton(selectSC, assignSC);

	//Assigns the selected Strategy Card to the player
	function assignSC() {
		if(!gameState.currentPlayer.sc1){
			gameState.currentPlayer.sc1 = stratCards[node.index-1];
		} else {
			gameState.currentPlayer.sc2 = stratCards[node.index-1];
		}
		stratCards[node.index-1].active = false;
		shrinkSC();
		
		console.log(gameState.currentPlayer);
		console.log(gameState.currentPlayer.sc1);
		console.log(gameState.currentPlayer.sc2);
		//Advance the turn once a card is selected
		gameState.nextTurn();
	}
}

/*******************
Player Info
*******************/

//Initialize players and update their home tiles
function createPlayers() {
	//Assign home tile locations based on # of players
	makeHomeTiles();

	//Create an array of players, define their home tile positions
	for(i=0; i<numPlayers; i++){
		players[i] = new Player(i+1, homes[i].x, homes[i].y);
	}

	//Update images for home tiles
	updateHomeTiles();

	updateStatus('Players initialized', true);
}


//Assign tiles to each player from the pool of all tiles
function assignTiles() {
	var allTiles = [];
	var t = 0;

	//Create master array of all tiles
	//Currently hacked to add *tilesPerPlayer* of each color to the array
	//Will fix later to add actual tiles
	var possibleTiles = ['orange', 'lightBlue', 'green', 'pink', 'red', 'blue'];
	for(i=0; i<numPlayers; i++){
		for(t=0; t<tilesPerPlayer; t++) {
			allTiles.push(images[possibleTiles[i]]);
		}
	}
	/** *****Will use this again once real tiles are implemented ******
	//Assign random tiles to each player
	for(i=0; i<numPlayers; i++){
		for(t=0; t<tilesPerPlayer; t++) {
			var rand = Math.floor(Math.random()*(allTiles.length));

			//if random tile does not exist, select a new random tile
			while(!allTiles[rand]){
				rand = Math.floor(Math.random()*(allTiles.length));
			}
			//assign random tile to player
			players[i].tiles.push(allTiles[rand]);

			//remove random tile from pool of tiles
			allTiles[rand] = null;
		}
	}
	**/

	//Assign single color tiles to each player
	//***Only use until real tiles are implemented***
	for(i=0; i<numPlayers; i++){
		for(t=0; t<tilesPerPlayer; t++) {
			players[i].tiles.push(images[possibleTiles[i]]);
		}
	}
}

//Displays group of tiles selected for each player
function drawPlayerTiles() {
	for(i=0; i<tilesPerPlayer; i++){
		//Run separately for each player - eventually server side?
		//For now, only draw for player 1 (me)
		gameState.currentPlayer.tileImages[i] = new Kinetic.Image({
			x: 7/8*stage.attrs.width,
			y: hexHeight*i,
			image: gameState.currentPlayer.tiles[i],
			width: hexWidth,
			height: hexHeight,
		});

		layerPlayerTiles.add(gameState.currentPlayer.tileImages[i]);
	}

	layerPlayerTiles.draw();

	layerPlayerTiles.on('click', selectToPlace);
	layer.off('click');
}


/*******************
Status Console
*******************/

// Append a message to the status window and scroll to the bottom. By default, don't print a time stamp.
function updateStatus(msg) {
   updateStatus(msg, false);
}

function updateStatus(msg, stamp) {
   var statusDiv = document.getElementById('status');

   if ( stamp ) {
       var now = new Date();
       statusDiv.innerText += now.getHours() + ':' + now.getMinutes() + '> ' + msg + '\n';
   } else {
       statusDiv.innerText += msg + '\n';
   }
   // Scroll to the bottom of the window
   statusDiv.scrollTop = statusDiv.scrollHeight - 50;
}

/*****************
UI Elements
*******************/


//Add text at the top left to indicate player turn
var playerText = new Kinetic.Text({
	x: 3,
	y: 35,
	fontSize: 30,
	fontFamily: 'Calibri',
	fill: 'black',
});
function turn(txt){
	playerText.remove();
	playerText.textArr[0].text = txt;
	layerStatus.add(playerText);
	layerStatus.draw();
}

//Add text at the top left to indicate the game phase
var phaseText = new Kinetic.Text({
	x: 3,
	y: 0,
	fontSize: 30,
	fontFamily: 'Calibri',
	fill: 'black',
});
function phase(txt) {
	phaseText.remove();
	phaseText.textArr[0].text = txt;
	layerStatus.add(phaseText);
	layerStatus.draw();
}

//Makes a button for use in the game
function GameButton(txt, xPos, yPos, size) {
	this.bText = new Kinetic.Text({
		x: xPos,
		y: yPos,
		text: txt,
		fontSize: size,
		fontFamily: 'Calibri',
		fill: 'black',
	})
	//Adds a rectangle behind the text
	this.bkg = new Kinetic.Rect({
		cornerRadius: 5,
		x: this.bText.getX()-5,
		y: this.bText.getY()-2,
		width: this.bText.getWidth()+10,
		height: this.bText.getHeight()+4,
		fill: 'white',
		stroke: 'black',
	})
}

function drawButton(name, func) {
	layerStatus.add(name.bkg);
	layerStatus.add(name.bText);
	name.bText.on('click', func);
	layerStatus.draw();
}

function hideButton(name) {
	name.bkg.remove();
	name.bText.remove();
	name.bText.off('click');
	layerStatus.draw();
}

/*******************
Classes
*******************/

//Class defining game tile info
function Tile(col, row) {
	this.image;
	this.col;
	this.row;
}

//Class defining X and Y positions for a hex
function Hex(x, y) {
	this.x = x;
	this.y = y;
}

//Class for Strategy Cards
function StratCard(num) {
	this.num = num;
	this.image;
	this.active;
}

//Class containing player variables
function Player(num, homeX, homeY) {
	this.num = num;
	this.homeX = homeX;
	this.homeY = homeY;
	this.homeTile = images['home'+(num)];
	this.tiles = [];
	this.tileImages = [];
	this.turn;
	this.sc1;
	this.sc2;
}

/*******************
Start Game
*******************/

//Load images, then start the game
loadImages(sources, init);
