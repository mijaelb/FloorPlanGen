/**
 * Applet code for procedurally generating floor plans with the metropolis algorithm
 *
 * @link   URL
 * @file   FloorPlanGen.js
 * @author Mijael Bueno at TU Delft
 * @since  1.0.0
 */

// Store the content of the room graphs
const graph = {
    x: 0,
    y: 0,
    columns: 0,
    rows: 0,
    nodes: 0,
    graphics: undefined,
    container: undefined,
    shapes: [],
    sprites: [],
    links: [],
    positions: [],
    labels: [],
    labels_areas: [],
    areas: [],
    ratios: [],
    names: [],
    types: [],
    colors: []
};

// Main grid
const grid = {
    x: 0,
    y: 0,
    columns: 0,
    rows: 0,
    cell_width: 0,
    cell_height: 0,
    cost: 0,
    access_cost: 0,
    dimensions_cost: 0,
    shape_cost: 0,
    best_cost: 0,
    cells: [],
    matrix: [],
    best_matrix:[],
    labels: [],
    labels_obj:[],
    names: [],
    walls: [],
    areas: [],
    ratios: [],
    container: undefined,
    graphics: undefined,
    init: false,
    running: false,
    paused: false,
    ticks: 0,
    elapsed_time: 0,
    found_best_at_time: 0,
    found_best_at_tick : 0
};

// Rooms
const rooms = {
    names: ["Entrance", "Garage", "Hallway", "Bedroom", "Living Room", "Bathroom", "Kitchen", "Washing Room", "Storage Room", "Guest Room", "Study Room"],
    types: [1, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0],
    ratios: [5/4, 4/3, 3/2, 16/10, 16/9, 1.85, 2.35, 1, 4/5, 3/4, 2/3, 10/16, 9/16, 1/1.85, 1/2.35]  // 1.25 1.33 1.5 1.6 1.77 1.85 2.35
};

// Check if the app is seen in mobile
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/.test(navigator.userAgent);
let globalDragging = false;

// Grid parameters
var grid_columns = 50;
var grid_rows = 50;
var cell_width = 15;
var cell_height = 15;
var NODES_DISTANCE = 100;

// Grid labels
var gridLabels = {
    North: 'N',
    South: 'S',
    West: 'W',
    East: 'E',
    Blocked: 'X',
    Empty: '.'
};

// Cell Directions
var West = [-1, 0];
var East = [1, 0];
var North = [0, -1];
var South = [0, 1];

// Directions array
var directions = [North, South, West, East];
var directionsLabels = [gridLabels.North, gridLabels.South, gridLabels.West, gridLabels.East];

// Generation parameters
var EPSILON = 1;
var LIMIT = Math.pow(2 * EPSILON, 2);
var BETA = 0.5;
var BETA_START = BETA;
var BETA_LIMIT = 1;
var BETA_DELTA = 0.00005;
var DOOR_SIZE = 2;
var KA = 1;
var KD = 1;
var KS = 1;
var KR = 1;
var KO = 1;
var SPLIT_VERTICES_PROB = 0.5;
var SPLIT_ANY_PROB = 0.9;
var PROPOSAL_MOVE_PROB = 0.5;
var NUMBER_OF_ROOMS = 12;

// Initiatialize PIXI app!
const app = new PIXI.Application(window.innerWidth, window.innerHeight, { antialias: true });
app.renderer.backgroundColor = 0x212121;
app.renderer.plugins.interaction.on('mouseup', onClick);
app.renderer.clearBeforeRender = false;
app.renderer.resize(window.innerWidth, window.innerHeight);
document.body.appendChild(app.view);

const viewport = new PIXI.extras.Viewport({
    screenWidth: window.innerWidth,
    screenHeight:  window.innerHeight,
    worldWidth: window.innerWidth,
    worldHeight: window.innerHeight
});
viewport.wheel().drag().decelerate();

function resize() {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    viewport.screenWidth = window.innerWidth;
    viewport.screenHeight = window.innerHeight;
    viewport.worldWidth = window.innerWidth;
    viewport.worldHeight = window.innerHeight;
}
window.onresize = resize;

// Label Styles
const gridLabelStyle = new PIXI.TextStyle({
    fontFamily: 'Arial',
    fontSize: 8,
    fill: '#ffffff', // gradient
});

// Name Styles
const gridNameStyle = new PIXI.TextStyle({
    fontFamily: 'Arial',
    fontSize: 8,
    fill: '#ffffff', // gradient
    dropShadow: true,
    dropShadowAlpha: 0.5,
    dropShadowAngle: 0.9,
    dropShadowBlur: 2,
    dropShadowDistance: 2
});
const labelStyle = new PIXI.TextStyle({
    fontFamily: 'Arial',
    fontSize: 10,
    fill: '#ffffff', // gradient
});

// Create a new console text
const output = new PIXI.Text("Log", labelStyle);
app.stage.addChild(viewport);
app.stage.addChild(output);

/**
 * Initialize APP!
 */
init();
function init(){
    BETA = BETA_START;
    grid.init = false;
    resetViewport(viewport);
    createGraph(0, 0,  NUMBER_OF_ROOMS, rooms, graph, viewport);
    var dim = getAverageSquareDimensions(graph.areas);
    createGrid(graph.columns*NODES_DISTANCE, 0, dim.width*graph.columns*2, dim.height*graph.rows*2, cell_width, cell_height,  grid, graph, viewport);
}

/**
 * Graphical user interface parameters!
 */
var gui;
const controls = {
    number_of_rooms: NUMBER_OF_ROOMS,
    epsilon: EPSILON,
    beta: BETA,
    beta_start: BETA_START,
    beta_limit: BETA_LIMIT,
    door_size: DOOR_SIZE,
    ka: KA,
    kd: KD,
    ks: KS,
    kr: KR,
    ko: KO
};
guiSetup();

/**
 * At the GUI elements into the application
 */
function guiSetup(){
    gui = new dat.GUI();
    gui.add(controls, 'number_of_rooms').min(2).max(100).step(1).onChange(function(value){NUMBER_OF_ROOMS = value; init(); });
    gui.add(controls, 'epsilon').min(1).max(4).step(1).onChange(function(value){EPSILON = value; LIMIT = Math.pow(2 * EPSILON, 2); });
    gui.add(controls, 'beta').min(0.1).max(2).listen().onChange(function(value){BETA = value;});
    gui.add(controls, 'beta_start').min(0.1).max(2).step(0.1).onChange(function(value){BETA_START = value;});
    gui.add(controls, 'beta_limit').min(0.1).max(2).step(0.1).onChange(function(value){BETA_LIMIT = value;});
    gui.add(controls, 'door_size').min(2).max(6).step(1).onChange(function(value){DOOR_SIZE = value; });
    gui.add(controls, 'ka').min(0.01).max(10).onChange(function(value){KA = value;});
    gui.add(controls, 'kd').min(0.01).max(10).onChange(function(value){KD = value;});
    gui.add(controls, 'ks').min(0.01).max(10).onChange(function(value){KS = value;});
    gui.add(controls, 'kr').min(0.01).max(10).onChange(function(value){KR = value;});
    gui.add(controls, 'ko').min(0.01).max(10).onChange(function(value){KO = value;});
}

/**
 * Update the controls values
 */
function updateControls(){
    controls.number_of_rooms = NUMBER_OF_ROOMS;
    controls.epsilon = EPSILON;
    controls.beta = BETA;
    controls.beta_start = BETA_START;
    controls.beta_limit = BETA_LIMIT;
    controls.door_size = DOOR_SIZE;
    controls.ka = KA;
    controls.kd = KD;
    controls.ks = KS;
    controls.kr = KR;
    controls.ko = KO;
    var elem = document.getElementById('pause');
    elem.innerHTML = grid.paused ? "Continue" : "Pause";
}

/**
 * @param {object} props: The properties of the square fill, strokeWidth, stroke, size
 * @method createSquare: Create a simple squared shape
 * @return {PIXI.Texture}
 */
function createSquare(props) {
    const graphics = new PIXI.Graphics();
    graphics.beginFill(props.fill);
    graphics.lineStyle(props.strokeWidth, props.stroke);
    graphics.moveTo(props.strokeWidth, props.strokeWidth);
    graphics.lineTo(props.size - props.strokeWidth, props.strokeWidth);
    graphics.lineTo(props.size - props.strokeWidth, props.size - props.strokeWidth);
    graphics.lineTo(props.strokeWidth, props.size - props.strokeWidth);
    graphics.lineTo(props.strokeWidth, props.strokeWidth);
    graphics.endFill();
    return app.renderer.generateTexture(graphics, PIXI.SCALE_MODES.LINEAR, 2);
}

/**
 * @param {object} _graph: An structure that holds all the content for the graph
 * @method createShapes: Get an array of colored shapes to be used as nodes for the graph
 * @return {array:PIXI.Textures}: An array of shapes created as PIXI Textures
 */
function createShapes(_graph) {
    var shapes = [];
    for (var i = 0; i < _graph.nodes; i++)
        shapes[i] = createSquare({
            fill: _graph.colors[i],
            stroke: 0xffffff,
            strokeWidth: 0.7,
            size: isMobile ? 16 : 16
        });
    return shapes;
}

/**
 * @param {integer} x: The x position of the graph
 * @param {integer} y: The y position of the graph
 * @param {integer} nodes: The number of nodes to be created
 * @param {object} _rooms: The (data-driven model) object that contains the rooms to be added randomly
 * @param {object} _graph: An structure to store the graph
 * @param {object} _viewport: The viewport where the object will be displayed
 * @method createGraph: Create a random graph where every node has a path to another node.
 */
function createGraph(x, y, nodes, _rooms, _graph, _viewport) {
    var count = 0;

    _graph.x = x;
    _graph.y = y;
    _graph.nodes = nodes;
    _graph.columns = Math.ceil(Math.sqrt(nodes));
    _graph.rows = Math.ceil(nodes / _graph.columns);
    for (var j = 0; j < _graph.rows; j++)
        for (var i = 0; i < _graph.columns; i++)
            if (count < nodes) {
                _graph.positions[count] = [i, j];
                var rand = Math.round(MathRandom()*20 + 10);
                var rand = rand + rand % 2;
                _graph.areas[count] = rand;
                _graph.ratios[count] = _rooms.ratios[Math.floor(MathRandom() * _rooms.ratios.length)];
                var idx = Math.floor(MathRandom() * _rooms.names.length);
                _graph.names[count] = _rooms.names[idx];
                _graph.types[count] = _rooms.types[idx];
                _graph.colors[count] = getRandomColor();
                count++;
            }

    _graph.graphics = new PIXI.Graphics();
    _graph.container = new PIXI.Container();
    _graph.shapes = createShapes(_graph);
    _graph.sprites = createSprites(_graph);

    // Create random connections between nodes
    // and recursively check if they have paths between them
    while (!checkGraph(_graph)) {
        _graph.links = createLinks(_graph);
        _graph.links = solveCrossedLinks(_graph);
    }

    _graph.labels = createLabels(_graph.names, labelStyle, _graph);
    var labels_areas = [];
    for(var i = 0; i < _graph.nodes; i++)
        labels_areas[i] = " " + _graph.areas[i] + " - " + _graph.ratios[i].toString().match(/^-?\d+(?:\.\d{0,2})?/)[0];

    _graph.labels_areas = createLabels(labels_areas, labelStyle, _graph);

    _viewport.addChild(_graph.graphics);
    _viewport.addChild(_graph.container);
    updateGraph(_graph);
}

/**
 * @param {object} data: The data obtained from the saved json file
 * @param {object} _viewport: The PIXI.Viewport object where we displayed the content of this application
 * @param {object} _graph: The structure that contains the elements of the graph
 * @method createGraphFromData: Build a new graph from a loaded data
 */
function createGraphFromData(data, _graph, _viewport){
    _graph.x = data.graph_x;
    _graph.y = data.graph_y;
    _graph.nodes = data.graph_nodes;
    _graph.columns = data.graph_columns;
    _graph.rows = data.graph_rows;
    _graph.positions = data.graph_positions;
    _graph.areas = data.graph_areas;
    _graph.ratios = data.graph_ratios;
    _graph.names = data.graph_names;
    _graph.types = data.graph_types;
    _graph.colors = data.graph_colors;
    _graph.graphics = new PIXI.Graphics();
    _graph.container = new PIXI.Container();
    _graph.shapes = createShapes(_graph);
    _graph.sprites = createSprites(_graph);
    _graph.labels = createLabels(_graph.names, labelStyle, _graph);
    _graph.links = data.graph_links;

    var labels_areas = [];
    for(var i = 0; i < _graph.nodes; i++)
        labels_areas[i] = " " + _graph.areas[i] + " - " + _graph.ratios[i].toString().match(/^-?\d+(?:\.\d{0,2})?/)[0];

    _graph.labels_areas = createLabels(labels_areas, labelStyle, _graph);

    _viewport.addChild(_graph.graphics);
    _viewport.addChild(_graph.container);
    updateGraph(_graph);
}

/**
 * @param _viewport: PIXI.Viewport used to display the content of the application
 * @method resetViewport: Remove every element inside the viewport
 */
function resetViewport(_viewport){
    while(_viewport.children[0]) { _viewport.removeChild(_viewport.children[0]); }
}

/**
 * @param {object} _graph: The structure that stores all the elements of the graphics
 * @method createSprites: create PIXI.Sprite for each shape in the graphics
 * @return {array:PIXI.Sprite}: Returns an array with all the PIXI.Sprite objects.
 */
function createSprites(_graph) {
    var sprites = [];
    for (var i = 0; i < _graph.nodes; i++) {
        const sprite = new PIXI.Sprite(_graph.shapes[i]);
        sprite.x = _graph.x + _graph.positions[i][0] * NODES_DISTANCE;
        sprite.y = _graph.y + _graph.positions[i][1] * NODES_DISTANCE + 20;
        sprite.radius = 10;
        sprite.index = i;
        sprite.anchor.x = 0.5;
        sprite.anchor.y = 0.5;
        sprite.interactive = true;
        sprite.buttonMode = true; // cursor change
        sprite.scale.set(4);
        sprite
            .on("pointerdown", onDragStart)
            .on("pointerup", onDragEnd)
            .on("pointerupoutside", onDragEnd)
            .on("pointerover", onMouseOver)
            .on("pointerout", onMouseOut)
            .on("pointermove", onDragMove);
        sprites.push(sprite);
        _graph.container.addChild(sprite);
    }
    return sprites;
}

/**
 * @param {array:strings} strings: Array with the labels texts
 * @param {object} style: Structure that holds the properties of the label style
 * @param {object} _graph: An structure that stores all the elements of the graph
 * @method createLabels: Create new PIXI.Text objects for each label in the graph
 * @return {array: PIXI.Text}: The array with all the PIXI.Text objects
 */
function createLabels(strings, style, _graph) {
    var labels = [];
    for (var i = 0; i < _graph.nodes; i++) {
        const text = new PIXI.Text(strings[i], style);
        text.x = _graph.sprites[i].x;
        text.y = _graph.sprites[i].y;
        text.anchor.x = 0.5;
        text.anchor.y = 0.5;
        labels.push(text);
        _graph.container.addChild(text);
    }
    return labels;
}

/**
 * @param {object} _graph: An structure that stores all the elements of the graph
 * @method createLinks: Create random links between nodes
 * @returns {array: PIXI.Text}: The array with all the PIXI.Text objects
 */
function createLinks(_graph) {
    var links = [];

    for (var i = 0; i < _graph.nodes - 1; i++) {
        // Retrieve positions of the current graph node
        var column = _graph.positions[i][0];
        var row = _graph.positions[i][1];

        // Randomly select a link direction
        var select = [MathRandom() > 0.5, MathRandom() > 0.5, MathRandom() > 0.5, MathRandom() > 0.5];
        var dir = [(select[0] ? [-1, 1] : 0),
                   (select[1] ? [0, 1] : 0),
                   (select[2] ? [1, 1] : 0),
                   (select[3] ? [1, 0] : 0)];

        // Create random links to 4 directions
        //               (R)-E
        //				 /|\
        //             SW S SE
        for (var n = 0; n < dir.length; n++) {
            if (dir[n] != 0) {
                var dx = column + dir[n][0];
                var dy = row + dir[n][1];
                if (_graph.columns * dy + dx < _graph.nodes) {
                    if (dx >= 0 && dx < _graph.columns && dy >= 0 && dy < _graph.rows) {
                        links.push({
                            source: _graph.columns * row + column,
                            target: _graph.columns * dy + dx,
                            value: 2
                        });
                    }
                }
            }
        }
    }

    return links;
}

/**
 * @param {object} _graph: An structure that holds the content of the graph
 * @method solveCrossedLinks: A method that solves links that cross each other by removing one at random
 * @returns {array} links: A new array of corrected links
 */
function solveCrossedLinks(_graph) {
    var links = _graph.links;
    // Iterate over all the elements in the graph except the boundaries (that is why columns - 1 and rows - 1)
    for (var j = 0; j < _graph.rows; j++) {
        for (var i = 0; i < _graph.columns; i++) {
            var current = _graph.columns * j + i;
            if (current < _graph.nodes) {
                nextE = _graph.columns * j + i + 1;
                nextS = _graph.columns * (j + 1) + i;
                nextSE = _graph.columns * (j + 1) + i + 1;

                // Find if there is a link to south east
                var linksFromCurrentToSE = links.filter(function(link) {
                    return link.source == current && link.target == nextSE;
                });

                // Find if there is a link to south west
                var linksFromNextToS = links.filter(function(link) {
                    return link.source == nextE && link.target == nextS;
                });

                // Check if we found a crossed link!
                if (linksFromCurrentToSE.length != 0 && linksFromNextToS.length != 0) {
                    // Crossed links found!	console.log("Cross found at:" + current);
                    // Randomly solve and decide which link to remove
                    var random = MathRandom() > 0.5;
                    links = links.filter(function(link) {
                        if (random) return !(link.source == current && link.target == nextSE);
                        else return !(link.source == nextE && link.target == nextS);
                    });
                }
            }
        }
    }

    return links;
}

/**
 * @param {object} _graph: A structure that holds the elements of the graph
 * @method checkGraph: Recursively check if every node in the graph is connected through a path
 * @return {boolean}: Check if every node was visited, thus return a true if the graph is connected.
 */
function checkGraph(_graph) {
    const visited = [];
    let x = (visited) => visited.filter((v, i) => visited.indexOf(v) === i);
    recursiveCheckGraph(0, visited, _graph);
    return x(visited).length == _graph.nodes;
}

/**
 * @param {integer} current: The current node visited
 * @param {array} visited: Array of visited nodes
 * @param {object} _graph: An structure that stores all the elements of the graphics
 */
function recursiveCheckGraph(current, visited, _graph) {
    var linksFromNode = _graph.links.filter(function(link) {
        return link.source == current;
    });
    var linksToNode = _graph.links.filter(function(link) {
        return link.target == current;
    });

    // Store the current node number
    visited.push(current);

    // Walk the graph forward
    // Walk the graph from left to right and top to bottom
    while (linksFromNode.length != 0) {
        if (visited.indexOf(linksFromNode[0].target) == -1)
            recursiveCheckGraph(linksFromNode[0].target, visited, _graph);

        linksFromNode.splice(0, 1);
    }

    // Walk the graph backwards
    // In case there are nodes that were not visited then walk from right to left and bottom to top
    while (linksToNode.length != 0) {
        if (visited.indexOf(linksToNode[0].source) == -1)
            recursiveCheckGraph(linksToNode[0].source, visited, _graph);

        linksToNode.splice(0, 1);
    }
}

/**
 * @param {object} _graph: An structure that stores all the elements of the graphics
 * @method updateGraph:  Update the graph visual elements
 */
function updateGraph(_graph){
    updateGraphLinks(_graph);
    updateGraphLabels(_graph);
}

/**
 * @param {object} _graph: An structure that stores all the elements of the graphics
 * @method updateGraphLinks:  Update the position of the graph links
 */
function updateGraphLinks(_graph) {
    _graph.graphics.clear();
    _graph.graphics.alpha = 0.7;
    _graph.links.forEach(link => {
        let {
            source,
            target
        } = link;
        _graph.graphics.lineStyle(link.value, 0xfefefe);
        _graph.graphics.moveTo(_graph.sprites[source].x, _graph.sprites[source].y);
        _graph.graphics.lineTo(_graph.sprites[target].x, _graph.sprites[target].y);
    });
    _graph.graphics.endFill();
}

/**
 * @param {object} _graph: An structure that stores all the elements of the graphics
 * @method updateGraphLabels:  Update the position of the graph labels
 */
function updateGraphLabels(_graph) {
    for (var i = 0; i < _graph.nodes; i++) {
        _graph.labels[i].x = _graph.sprites[i].x;
        _graph.labels[i].y = _graph.sprites[i].y + _graph.sprites[i].height / 2 * 1.5;
        _graph.labels_areas[i].x = _graph.sprites[i].x;
        _graph.labels_areas[i].y = _graph.sprites[i].y;
    }
}

/**
 *
 */
app.ticker.add(function update(delta) {
    if(grid.paused) start();
    if(grid.ticks % 1 == 0) {
        grid.elapsed_time += end()/1000;
        drawGrid(graph, grid);
        printOutput();
        start();
    }
    updateFloorPlan(graph, grid);
    updateControls();
});

/**
 * @param x
 * @param y
 * @param columns
 * @param rows
 * @param cell_width
 * @param cell_height
 * @param _grid
 * @param _graph
 * @param _viewport
 */
function createGrid(x, y, columns, rows, cell_width, cell_height, _grid, _graph, _viewport) {
    _grid.x = x;
    _grid.y = y;
    _grid.columns = columns;
    _grid.rows = rows;
    _grid.cell_width = cell_width;
    _grid.cell_height = cell_height;
    _grid.container = new PIXI.Container();
    _grid.graphics = new PIXI.Graphics();
    _grid.matrix = createGridMatrix(-1, columns, rows);
    _grid.labels_obj = createGridLabelsObject(gridLabels.Empty, gridLabelStyle, _grid);
    _grid.labels = createGridLabels(gridLabels.Empty, _grid);
    _grid.names = createGridNames(gridNameStyle, _graph, _grid);
    _grid.areas = new Array(_graph.nodes);
    _viewport.addChild(_grid.graphics);
    _viewport.addChild(_grid.container);
    updateGrid(_grid);
}

/**
 * @param data
 * @param _grid
 * @param _viewport
 */
function createGridFromData(data, _graph, _grid, _viewport){
    _grid.x = data.grid_x;
    _grid.y = data.grid_y;
    _grid.columns = data.grid_columns;
    _grid.rows = data.grid_rows;
    _grid.cell_width = data.grid_cell_width;
    _grid.cell_height = data.grid_cell_height;
    _grid.cost = data.grid_cost;
    _grid.access_cost = data.grid_access_cost;
    _grid.dimensions_cost = data.grid_dimensions_cost;
    _grid.shape_cost = data.grid_shape_cost;
    _grid.best_cost = data.grid_best_cost;
    _grid.matrix = data.grid_matrix;
    _grid.best_matrix = data.grid_best_matrix;
    _grid.ticks = data.grid_ticks;
    _grid.elapsed_time = data.grid_elapsed_time;
    _grid.found_best_at_time = data.grid_found_best_at_time;
    _grid.found_best_at_tick = data.grid_found_best_at_tick;
    _grid.container = new PIXI.Container();
    _grid.graphics = new PIXI.Graphics();
    _grid.labels_obj = createGridLabelsObject(gridLabels.Empty, gridLabelStyle, _grid);
    _grid.labels = createGridLabels(gridLabels.Empty, _grid);
    _grid.names = createGridNames(gridNameStyle, _graph, _grid);
    _grid.areas = new Array(_graph.nodes);
    _grid.paused = true;
    _viewport.addChild(_grid.graphics);
    _viewport.addChild(_grid.container);
    updateGrid(_grid);
    drawGrid(_graph, _grid);
}

/**
 * @param {integer} _default: The default value to set to every cell in the grid
 * @param {integer} columns: The number of columns in the grid
 * @param {integer} row: The number of rows in the grid
 * @method createGridMatrix creates a new matrix to be used in a grid
 * @returns {matrix integer}: The new matrix
 */
function createGridMatrix(_default, columns, rows) {
    matrix = [];
    for (var i = 0; i < columns; i++) {
        matrix[i] = [];
        for (var j = 0; j < rows; j++)
            matrix[i][j] = _default;
    }
    return matrix;
}

/**
 * @param {string} _default: The default string value for the cell labels
 * @param {object} style: An structure that holds the style of the text object
 * @param {object} _grid: An structure that holds the content of the grid
 * @method createGridLabelsObject: Create a matrix with all the text objects for each cell
 * @returns {matrix:PIXI.Text}: Matrix of PIXI Text objects
 */
function createGridLabelsObject(_default, style, _grid) {
    matrix = [];
    for (var i = 0; i < _grid.columns; i++) {
        matrix[i] = [];
        for (var j = 0; j < _grid.rows; j++) {
            const text = new PIXI.Text(_default, style);
            text.anchor.x = 0.5;
            text.anchor.y = 0.5;
            text.x = _grid.x + i * _grid.cell_width + _grid.cell_width / 2;
            text.y = _grid.y + j * _grid.cell_height + _grid.cell_height / 2;
            text.alpha = 0.5;
            matrix[i].push(text);
            _grid.container.addChild(text);
        }
    }
    return matrix;
}

/**
 * @param _default
 * @param _grid
 * @returns {[]|Array}
 */
function createGridLabels(_default, _grid) {
    matrix = [];
    for (var i = 0; i < _grid.columns; i++) {
        matrix[i] = [];
        for (var j = 0; j < _grid.rows; j++)
            matrix[i][j] = _default;
    }
    return matrix;
}

/**
 * @param style
 * @param _graph
 * @param _grid
 * @returns {[]|Array}
 */
function createGridNames(style, _graph, _grid) {
    array = [];
    for (var i = 0; i < _graph.nodes; i++) {
        const text = new PIXI.Text(_graph.names[i], style);
        text.alpha = 1;
        array.push(text);
        _grid.container.addChild(text);
    }
    return array;
}

/**
 * @param {integer} column: The [i] column of the selected cell
 * @param {integer} row: The [j] row of the selected cell
 * @param {integer} value: The value to be set in that cell
 * @param {object} _grid: An structure that holds the grid content
 * @returns {bool}
 * @method setCell: Set the value of the [i][j] cell.
 */
function setCell(column, row, value, _grid) {
    if (column >= 0 && row >= 0 && column < _grid.columns && row < _grid.rows) {
        _grid.matrix[column][row] = value;
        return true;
    }
    return false;
}

/**
 * @param {integer} x
 * @param {integer} y
 * @returns {{x: *, column: number, y: *, row: number}}
 * @method getCellFromClientCoords: Return the cell coordinates and index of the clicked squared in the grid
 */
function getCellFromClientCoords(x, y) {
    cell_x = x - x % cell_width;
    cell_y = y - y % cell_height;
    return {
        x: 1 + cell_x,
        y: 1 + cell_y,
        column: cell_x / cell_width,
        row: cell_y / cell_height
    };
}

/**
 * @param column
 * @param row
 * @param _grid
 * @returns {{x: *, y: *}}
 * @method getCellCoords: Get the cell coordinates from the grid column and row
 */
function getCellCoords(column, row, _grid) {
    return {
        x: _grid.x + 1 + column * _grid.cell_width,
        y: _grid.y + 1 + row * _grid.cell_height
    };
}

/**
 * @param column
 * @param row
 * @param _grid
 * @returns {{column: *, row: *, label: *, value: *}|{column: *, row: *, label: *, value: number}}
 * @method getCellAt: Get the cell at the column and row specified, return an empty cell otherwise.
 */
function getCellAt(column, row, _grid){
    if(column >= 0 && column < _grid.columns && row >= 0 && row < _grid.rows)
        return {column: column, row: row, value: _grid.matrix[column][row], label: _grid.labels[column][row]};
    return {column: column, row: row, value: -1, label: gridLabels.Empty};
}
/**
 * @param _graph
 * @param _grid
 * @method drawGrid: Draw horizontal and vertical lines, and fill the cells with the proper colors
 */
function drawGrid(_graph, _grid) {
    _grid.graphics.clear();
    _grid.graphics.alpha = 1;

    // Draw the content of the cells
    drawCells(_graph, _grid);

    // Draw vertical lines
    for (var x = 0; x < _grid.columns * _grid.cell_width + 1; x += _grid.cell_width) {
        _grid.graphics.lineStyle(1, 0xfefefe, 0.5);
        _grid.graphics.moveTo(_grid.x + x, _grid.y);
        _grid.graphics.lineTo(_grid.x + x, _grid.y + _grid.rows * _grid.cell_height);
    }

    // Draw horizontal lines
    for (var y = 0; y < _grid.rows * _grid.cell_height + 1; y += _grid.cell_height) {
        _grid.graphics.lineStyle(1, 0xfefefe, 0.5);
        _grid.graphics.moveTo(_grid.x, _grid.y + y);
        _grid.graphics.lineTo(_grid.x + _grid.columns * _grid.cell_width, _grid.y + y);
    }

    _grid.graphics.endFill();
}

/**
 * @param _graph
 * @param _grid
 */
function drawCells(_graph, _grid){
    var visited = []
    for (var i = 0; i < _grid.columns; i++) {
        for (var j = 0; j < _grid.rows; j++) {
            var value = _grid.matrix[i][j];
            if (value != -1 && !visited.includes(value)) {
                var cell = getCellCoords(i, j, _grid);
                _grid.names[value].x = cell.x;
                _grid.names[value].y = cell.y;
                visited.push(value);
            }
            _grid.labels_obj[i][j].text = _grid.labels[i][j];
            drawCell(i, j, _grid.matrix[i][j] != -1 ? _graph.colors[_grid.matrix[i][j]] : app.renderer.backgroundColor, _grid);
        }
    }
}

/**
 * @param column
 * @param row
 * @param color
 * @param _grid
 */
function drawCell(column, row, color, _grid) {
    _grid.graphics.beginFill(color, 0.8);
    _grid.graphics.drawRect(_grid.cells[column][row].x, _grid.cells[column][row].y, _grid.cell_width - 1, _grid.cell_height - 1);
    _grid.graphics.endFill();
}

/**
 * @param {char} _default: The default character to be used as the value
 *                         for all the cells in grid
 * @method resetGridLabels: Reset all the labels to a default value
 */
function resetGridLabels(_default, _grid) {
    for (var i = 0; i < _grid.columns; i++)
        for (var j = 0; j < _grid.rows; j++) {
            _grid.labels_obj[i][j].text = _default;
            _grid.labels[i][j] = _default;
        }
}

/**
 * @param {object} _grid: An structure that holds the content of the grid
 * @method updateGrid: Update the grid properties depending of the grid matrix
 */
function updateGrid(_grid) {
    resetArray(0, _grid.areas);
    for (var i = 0; i < _grid.columns; i++) {
        _grid.cells[i] = [];
        for (var j = 0; j < _grid.rows; j++){
            _grid.cells[i][j] = getCellCoords(i, j, _grid);
            _grid.labels[i][j] = getGridLabelAt(i, j, _grid);
            if(_grid.matrix[i][j] != -1)
                _grid.areas[_grid.matrix[i][j]]++;
        }
    }
    updateGridWalls(_grid);
}

/**
 * @param _grid
 */
function updateCellCoords(_grid){
    for (var i = 0; i < _grid.columns; i++) {
        _grid.cells[i] = [];
        for (var j = 0; j < _grid.rows; j++)
            _grid.cells[i][j] = getCellCoords(i, j, _grid);
    }
}

/**
 * @param _grid
 */
function updateGridLabels(_grid) {
    for (var i = 0; i < _grid.columns; i++)
        for (var j = 0; j < _grid.rows; j++)
            _grid.labels[i][j] = getGridLabelAt(i, j, _grid);
}

/**
 * @param _grid
 */
function updateGridWalls(_grid){
    _grid.walls = getCollinearWalls(_grid);
}

/**
 * @param _grid
 */
function updateGridAreas(_grid){
    resetArray(0, _grid.areas);
    for (var i = 0; i < _grid.columns; i++)
        for (var j = 0; j < _grid.rows; j++)
            if(_grid.matrix[i][j] != -1)
                _grid.areas[_grid.matrix[i][j]]++;
}

/**
 * @param column
 * @param row
 * @param _grid
 * @returns {string}
 */
function getGridLabelAt(column, row, _grid) {
    var isWall = false;
    var label = '';
    if (_grid.matrix[column][row] != -1) {
        for (var i = 0; i < directions.length; i++) {
            var x = column + directions[i][0];
            var y = row + directions[i][1];
            if (x >= 0 && x < _grid.columns && y >= 0 && y < _grid.rows) {
                if (_grid.matrix[x][y] != _grid.matrix[column][row]) {
                    label = label + directionsLabels[i];
                    isWall = true;
                }
            } else {
                label = label + directionsLabels[i];
                isWall = true;
            }
        }
    } else {
        return gridLabels.Empty;
    }

    return !isWall ? gridLabels.Blocked : label;
}

/**
 * @param _graph
 * @param _grid
 */
function initFloorPlan(_graph, _grid){
    BETA = BETA_START;
    var dimensions = getAverageSquareDimensions(_graph.areas);
    // Create Squares
    for (var i = 0; i < _graph.nodes; i++)
        setRectInGrid(i, Math.round(_grid.columns/2 - dimensions.width*_graph.columns/2) + _graph.positions[i][0] * dimensions.width, Math.round(_grid.rows/2 - dimensions.height*_graph.rows/2) +  _graph.positions[i][1] * dimensions.height, dimensions.width, dimensions.height, _grid);

    updateGrid(_grid);
    updateCost(_graph,_grid);
    drawGrid(_graph, _grid);
    _grid.best_cost = _grid.cost;
    _grid.init = true;
    _grid.ticks = 0;
    _grid.elapsed_time = 0;
    _grid.found_best_at_time = 0;
    _grid.found_best_at_tick = 0;
}

/**
 * @param _graph
 * @param _grid
 */
function updateFloorPlan(_graph, _grid){
    if(!_grid.init)
        initFloorPlan(_graph, _grid);
    else if (!_grid.running && !_grid.paused){
        _grid.running = true;

        // Make a backup of the last matrix
        last_matrix = duplicateMatrix(_grid.matrix);
        last_cost = _grid.cost;
        last_access_cost = _grid.access_cost;
        last_dimensions_cost = _grid.dimensions_cost;
        last_shape_cost = _grid.shape_cost;

        // Do a proposal move and update the cost of the layout
        doProposalMove(_graph, _grid);
        updateCost(_graph, _grid);
        new_cost = _grid.cost;

        // Accept or reject the new proposed layout with a certain probability
        var prob = Math.min(1, Math.exp(BETA * (last_cost - new_cost)));
        if(!checkFloorPlanAnomalies(_graph, _grid) || MathRandom() > prob){
            _grid.matrix = last_matrix;
            _grid.cost = last_cost;
            _grid.access_cost = last_access_cost;
            _grid.dimensions_cost = last_dimensions_cost;
            _grid.shape_cost = last_shape_cost;
        }

        // Store if it is the best cost
        if(_grid.cost < _grid.best_cost) {
            _grid.best_cost = _grid.cost;
            _grid.best_matrix = duplicateMatrix(_grid.matrix);
            _grid.found_best_at_time = _grid.elapsed_time;
            _grid.found_best_at_tick = _grid.ticks;
        }

        updateGrid(_grid);
        _grid.ticks++;
        _grid.running = false;
        if(BETA < BETA_LIMIT) BETA += BETA_DELTA;
    }
}

/**
 * @param _grid
 */
function resetFloorPlan(_grid){
    resetMatrix(-1, _grid.matrix);
    _grid.init = false;
}

/**
 * @param _graph
 * @param _grid
 * @returns {boolean}
 */
function checkFloorPlanAnomalies(_graph, _grid){
    return checkSplittedRooms(_graph, _grid);
}

// *********************************************
// COSTS ***************************************
// *********************************************

/**
 * @param _graph
 * @param _grid
 */
function updateCost(_graph, _grid){
    var Ca = getAccessibilityCost(_graph, _grid);
    var Cd = getDimensionsCost(_graph, _grid);
    var Cs = getShapeCost(_graph, _grid);
    _grid.access_cost = KA*Ca;
    _grid.dimensions_cost = KD*Cd;
    _grid.shape_cost = KS*Cs;
    _grid.cost = _grid.access_cost + _grid.dimensions_cost + _grid.shape_cost;
}

/**
 * @param _graph
 * @param _grid
 * @returns {number}
 */
function getAccessibilityCost(_graph, _grid){
    var access_count = 0;
    var last_source = -1;
    var walls = [];
    var links_length = _graph.links.length;
    // Check adjacency
    for(var i = 0; i < _graph.links.length; i++){
        if(_graph.links[i].source != last_source) {
            walls = getWallsFromGrid(_graph.links[i].source, _grid);
            last_source = _graph.links[i].source;
            if(_graph.types[_graph.links[i].source] > 0) {
                links_length++;
                if (checkAccessInGrid(walls, -1, _grid))
                    access_count++;
            }
        }
        if(checkAccessInGrid(walls, _graph.links[i].target, _grid))
            access_count++;
    }
    return links_length - access_count;
}

/**
 * @param _graph
 * @param _grid
 * @returns {number}
 */
function getDimensionsCost(_graph, _grid){
    var ratio_cost = 0;
    var area_cost = 0;
    for(var i = 0; i < _graph.nodes; i++){
        var walls = getWallsFromGrid(i, _grid);
        var dim = getLongestWallDimensions(walls);
        if(dim.height!=0){
            ratio_cost += Math.abs(dim.width/dim.height - _graph.ratios[i]);
            area_cost += Math.abs(_grid.areas[i] - _graph.areas[i]);
        }
    }
    return (ratio_cost + area_cost);
}

/**
 * @param _graphu
 * @param _grid
 */
function getShapeCost(_graph, _grid){
    var cost_r = 0;
    var cost_o = 0;
    var Mc;
    for(var i = 0; i < _graph.nodes; i++) {
        Mc = (getConvexHullArea(i, _grid) - _grid.areas[i]) + (getOutlineEdgesOfValue(i, _grid) - 4);
        cost_r += (1 - (_graph.types[i] == 2 ? 1:0)) * Mc;
    }
    return KR * cost_r + KO * (getOutlineWalls(_grid).length - 4);
}

/**
 * @param value
 * @param _grid
 * @returns {number}
 */
function getOutlineEdgesOfValue(value, _grid){
    var walls = getWallsFromGrid(value, _grid);
    return walls.length;
}

/**
 * @param _grid
 * @returns {[]}
 */
function getOutlineWalls(_grid){
    var walls = [];
    for(var i = 0; i < _grid.walls.length; i++){
        var temp = {label: _grid.walls[i].label, direction: _grid.walls[i].direction, cells:[]};
        for(var j = 0; j < _grid.walls[i].cells.length; j++){
            var cell = getCellAt(_grid.walls[i].cells[j].column + _grid.walls[i].direction[0], _grid.walls[i].cells[j].row + _grid.walls[i].direction[1], _grid);
            if(cell.value == -1)
                temp.cells.push(_grid.walls[i].cells[j]);
        }
        if(temp.cells.length != 0)
            walls.push(temp);
    }
    return walls;
}

/**
 * @param value
 * @param _grid
 * @returns {number}
 */
function getConvexHullArea(value, _grid){
    return getConvexHull(value, _grid).length;
}

/**
 * @param value
 * @param _grid
 * @returns {[]}
 */
function getConvexHull(value, _grid){
    var x_, y_, i, j;
    var start = false;
    var temp = [];
    var cells = [];
    // Loop in vertical and then in horizontal direction
    for (var n = 0; n < 2; n++) {
        x_ = n == 0 ? _grid.columns: _grid.rows;
        y_ = n == 0 ? _grid.rows: _grid.columns;
        for (var x = 0; x < x_; x++) {
            temp = [];
            start = false;
            for (var y = 0; y < y_; y++) {
                i = n == 0 ? x: y;
                j = n == 0 ? y: x;
                if (!start && _grid.matrix[i][j] == value) {
                    start = true;
                    if (!isItemInArray(cells, [i, j]))
                        cells.push([i, j]);
                } else if(start && _grid.matrix[i][j] != value) {
                    temp.push([i, j]);
                } else if (start && _grid.matrix[i][j] == value) {
                    temp.push([i, j]);
                    for (var k = 0; k < temp.length; k++) {
                        if (!isItemInArray(cells, temp[k]))
                            cells.push(temp[k]);
                    }
                    temp = [];
                }
            }
        }
    }
    return cells;
}

/**
 * @param walls
 * @returns {{width: *, height: *}}
 */
function getLongestWallDimensions(walls){
    var width = 0;
    var height = 0;
    for(var i = 0; i < walls.length; i++){
        var width_ = walls[i].cells.length * Math.abs(walls[i].direction[0]);
        var height_ = walls[i].cells.length * Math.abs(walls[i].direction[1]);
        width = width_ > width ? width_:width;
        height = height_ > height ? height_:height;
    }
    return {width: width, height: height};
}

/**
 * @param walls
 * @param target
 * @param _grid
 * @returns {boolean}
 */
function checkAccessInGrid(walls, target, _grid){
    var count = 0;
    for(var i = 0; i < walls.length; i++){
        for(var j = 0; j < walls[i].cells.length; j++){
            if(walls[i].cells.length < DOOR_SIZE) break;
            var dx = walls[i].cells[j].column + walls[i].direction[0];
            var dy = walls[i].cells[j].row + walls[i].direction[1];
            var cell = getCellAt(dx, dy, _grid);

            if(cell.value == target) count++;
            else count = 0;

            if(count >= DOOR_SIZE) return true;
        }
    }
    return false;
}

/**
 * @param _grid
 * @returns {boolean}
 */
function checkLonelyRooms(walls, _grid){
    var count = 0;
    for(var i = 0; i < walls.length; i++){
        for(var j = 0; j < walls[i].cells.length; j++){
            var dx = walls[i].cells[j].column + walls[i].direction[0];
            var dy = walls[i].cells[j].row + walls[i].direction[1];
            var cell = getCellAt(dx, dy, _grid);

            if(cell.value != -1) count++;
            else count = 0;

            if(count == DOOR_SIZE) return false;
        }
    }
    return true;
}

/**
 * @param _graph
 * @param _grid
 */
function checkSplittedRooms(_graph, _grid){
    for(var i = 0; i < _graph.nodes; i++) {
        var walls = getWallsFromGrid(i, _grid);
        if(checkLonelyRooms(walls,_grid)) return false;
        if (!recursiveWalk(i, _grid)) return false;
    }
    return true;
}

/**
 * @param value
 * @param _grid
 * @returns {boolean}
 */
function recursiveWalk(value, _grid){
    const visited = [];  // Check if all the nodes are visited and the rooms are not splitted
    const single_path = []; // Check if there are small corridors
    var indices = getIndicesOf(value, _grid);
    if (indices.length == 0) return false;
    Walk(indices[0][0], indices[0][1], value, visited, single_path, _grid);
    return indices.length == visited.length && !single_path.includes(0);
}

/**
 * @param column
 * @param row
 * @param value
 * @param visited
 * @param _grid
 * @constructor
 */
function Walk(column, row, value, visited, single_path, _grid){
    var cell = getCellAt(column, row, _grid);
    var isVisited = isItemInArray(visited, [column, row]);
    if(value == cell.value && !isVisited){
        visited.push([column, row]);
        var b1 = Walk(column + 1, row, value, visited, single_path, _grid);
        var b2 = Walk(column - 1, row, value, visited, single_path, _grid);
        var b3 = Walk(column, row + 1, value, visited, single_path, _grid);
        var b4 = Walk(column, row - 1, value, visited, single_path, _grid);
        var bool = (b1 + b2 + b3 + b4) > 1 ? 1:0;
        single_path.push(bool);
        return 1;
    }

    return isVisited ? 1: 0;
}

/**
 * @param value
 * @param _grid
 * @returns {[]}
 */
function getIndicesOf(value, _grid){
    var indices = [];
    for(var i = 0; i < _grid.columns; i++)
        for(var j = 0; j < _grid.rows; j++)
            if(_grid.matrix[i][j] == value)
                indices.push([i, j]);
    return indices;
}

/**
 * @param areas
 * @returns {{width: *, height: *}}
 */
function getAverageSquareDimensions(areas){
    var average = getAverage(areas);
    var side = Math.round(Math.sqrt(average));
    return { width: side, height: side };
}

/**
 * @param arr
 * @returns {*}
 */
function getAverage(arr){
    const average = arr => arr.reduce( ( p, c ) => p + c, 0 ) / arr.length;
    return average(arr);
}

/**
 * @param value
 * @param x
 * @param y
 * @param width
 * @param height
 * @param _grid
 */
function setRectInGrid(value, x, y, width, height, _grid) {
    for (var i = x; i < x + width; i++)
        if (i < _grid.matrix.length)
            for (var j = y; j < y + height; j++)
                if (j < _grid.matrix[i].length)
                    _grid.matrix[i][j] = value;
}

/**
 * @param value
 * @param _grid
 * @returns {[]|Array}
 */
function getWalls(value, _grid){
    walls = [];
    for(var i = 0; i < directionsLabels.length; i++)
        walls = walls.concat(getCollinearWallsInDirection(directionsLabels[i], _grid, value));
    return walls;
}

/**
 * @param value
 * @param _grid
 * @returns {[]}
 */
function getWallsFromGrid(value, _grid){
    var walls_ = [];
    for(var i = 0; i < _grid.walls.length; i++){
        var temp = {label: _grid.walls[i].label, direction: _grid.walls[i].direction, cells:[]};
        for(var j = 0; j < _grid.walls[i].cells.length; j++)
            if(_grid.walls[i].cells[j].value == value)
                temp.cells.push(_grid.walls[i].cells[j]);

        if(temp.cells.length > 0)
            walls_.push(temp);
    }

    return walls_;
}

/**
 * @param _grid
 * @returns {[]|Array}
 */
function getCollinearWalls(_grid){
    walls = [];
    for(var i = 0; i < directionsLabels.length; i++)
        walls = walls.concat(getCollinearWallsInDirection(directionsLabels[i], _grid));
    return walls;
}

/**
 * @param dir
 * @param _grid
 * @param value
 * @returns {[]}
 */
function getCollinearWallsInDirection(dir, _grid, value){
    var walls = [];
    var isWall = false;
    var vertical = (dir == gridLabels.East || dir == gridLabels.West);
    var _i = vertical ? _grid.columns: _grid.rows;
    var _j = vertical ? _grid.rows:_grid.columns;
    var currentWall;
    for(var i = 0; i <= _i; i++){
        for(var j = 0; j <= _j; j++){
            var cell = vertical ? getCellAt(i, j, _grid): getCellAt(j, i, _grid);
            var isValue = value != undefined && cell.value == value ? true: (value != undefined ? false: true);
            if(!isWall && cell.label.includes(dir) && isValue){
              isWall = true;
              currentWall = {label: dir, direction: getDirectionFromLabel(dir), cells: []};
              currentWall.cells.push(cell);
            } else if(isWall && cell.label.includes(dir) && isValue){
              currentWall.cells.push(cell);
            } else if(isWall && (!cell.label.includes(dir) || !isValue)) {
              isWall = false;
              walls.push(currentWall);
            }
        }
    }
    return walls;
}

/**
 * @param wall
 * @returns {{cells: [], label: *, direction: *}}
 * @method splitCollinearWall: Get a splitted collinear wall
 */
function splitCollinearWall(wall){
    var newWall = {label: wall.label, direction:wall.direction, cells:[]}
    var last = -1;
    // Select randomly the direction of looping through the wall cells if bottomUp or TopDown
    var bottomUp = MathRandom() > 0.5;
    // Loop through the cells of the wall
    for(var i = 0; i < wall.cells.length; i++){
        var idx = bottomUp ? (wall.cells.length - (i+1)):i;
        var current = wall.cells[idx].value;

        // If the current split point is at least a door size
        if(i>DOOR_SIZE-1 && i < (wall.cells.length - DOOR_SIZE)) {
            // Split and prioritize vertices
            if (current != last) {
                if (MathRandom() > SPLIT_VERTICES_PROB && i != 0) break;
                else last = current;
            }

            // Split at any point
            if (MathRandom() > SPLIT_ANY_PROB) break;
        }

        newWall.cells.push(wall.cells[idx]);
    }

    // If the direction of the loop was bottom up then correct the direction of the cells in the wall array
    if(bottomUp){
        var newWall_ = {label: wall.label, direction: wall.direction, cells:[]};
        for(var i = newWall.cells.length - 1; i >= 0; i--)
            newWall_.cells.push(newWall.cells[i]);

        newWall = newWall_;
    }

    return newWall;
}

/**
 * @param {object} walls: An structure that holds information of direction and the array of indices of the walls to slide
 * @param {integer} delta: The distance to slide the walls
 * @param {boolean} forward: True if the slide is forward or False if it is backward
 * @param {object} _grid: An structure that holds the content of the grid
 */
function slideWall(wall, delta, forward, _grid) {
    for(var i = 0; i < wall.cells.length; i++)
        slideCell(wall.cells[i], delta, wall.direction, forward, _grid);
    updateGrid(_grid);
}

/**
 * @param {object} cell: An structure that contains the cell properties
 * @param {integer} delta: The distance to slide the cell
 * @param {array} direction: The direction [x, y] to slide the cell
 * @param {boolean} forward: True if to slide the cell forward or false if backwards
 * @param {object} _grid: An structure that holds the content of the grid
 */
function slideCell(cell, delta, direction, forward, _grid){
    var column = forward ? cell.column:(cell.column + direction[0]);
    var row = forward ? cell.row:(cell.row + direction[1]);
    var negdirection = direction.map(x => x * (-1));
    var direction = forward ? direction: negdirection;
    for(var k = 0; k < delta; k++){
        var dx = column + direction[0]*(k+1);
        var dy = row + direction[1]*(k+1);
        var value = getCellAt(column, row, _grid).value;
        if(setCell(dx, dy, value, _grid)) {
            cell.column = forward ? dx: (dx + direction[0]);
            cell.row = forward ? dy: (dy + direction[1]);
        }
    }
}

/**
 * @param label
 * @returns {number[]}
 */
function getDirectionFromLabel(label){
    switch(label){
        case gridLabels.East: return East;
        case gridLabels.West: return West;
        case gridLabels.North: return North;
        case gridLabels.South: return South;
        default: return [0,0];
    }
    return [0,0];
}

/**
 * @param wall
 * @param threshold
 * @param _grid
 */
function snapWall(wall, threshold, _grid){
    for(var i = 0; i < _grid.walls.length; i++){
        var dist = checkWallDistance(wall, _grid.walls[i], threshold);
        if(dist != 0){
            var dist = (wall.label == gridLabels.East || wall.label == gridLabels.South) ? -dist: dist;
            slideWall(wall, threshold, dist > 0, _grid);
            return;
        }
    }
}

/**
 * @param wall
 * @param wall_
 * @param threshold
 * @returns {number}
 */
function checkWallDistance(wall, wall_, threshold){
    if(wall.label == wall_.label) {
        var dx = wall.cells[0].column - wall_.cells[wall_.cells.length-1].column;
        var dy = wall.cells[0].row - wall_.cells[wall_.cells.length-1].row;
        var dx_ = wall.cells[wall.cells.length-1].column - wall_.cells[0].column;
        var dy_ = wall.cells[wall.cells.length-1].row - wall_.cells[0].row;
        if(dx == dx_ && Math.abs(dx) == threshold && (Math.abs(dy) == 1 || Math.abs(dy_) == 1))
            return dx;
        else if(dy == dy_ && Math.abs(dy) == threshold && (Math.abs(dx) == 1 || Math.abs(dx_) == 1))
            return dy;
    }
    return 0;
}

/**
 * @param _graph
 * @param _grid
 */
function swapRooms(_graph, _grid){
    var swap = 0;
    var swap_ = 0;
    while (swap == swap_){
        var swap = Math.round(MathRandom()*(_graph.nodes-1));
        var swap_ = Math.round(MathRandom()*(_graph.nodes-1));
    }

    var matrix = [];
    for(var i = 0; i < _grid.columns; i++){
        matrix[i] = [];
        for(var j = 0; j < _grid.rows; j++)
            if(_grid.matrix[i][j] == swap)  matrix[i][j] = swap_;
            else if(_grid.matrix[i][j] == swap_) matrix[i][j] = swap;
            else matrix[i][j] = _grid.matrix[i][j];
    }
    _grid.matrix = matrix;
    updateGrid(_grid);
}

/**
 * @param _graph
 * @param _grid
 */
function doProposalMove(_graph, _grid){
    if(MathRandom() > PROPOSAL_MOVE_PROB){
        var randomWall = _grid.walls[Math.floor(MathRandom()*_grid.walls.length)];
        var randomSplittedWall = splitCollinearWall(randomWall);
        slideWall(randomSplittedWall, Math.round(MathRandom()*(LIMIT-1)+1), MathRandom()<0.5, _grid);
        snapWall(randomSplittedWall, 1, _grid);
    } else {
        swapRooms(_graph, _grid);
    }
}

// ****************************************
// EVENTS HANDLE **************************
// ****************************************
//
function onClick(event) {

}

//
function pauseGrid(_grid){
    _grid.paused = !_grid.paused;
}
//
function onMouseOver() {
    this.isOver = true;
}

//
function onMouseOut() {
    if (this.dragging) {
        return;
    }
    this.isOver = false;
}

//
function onDragStart(event) {
    viewport.pausePlugin('drag');
    this.isDown = true;
    this.eventData = event.data;
    this.alpha = 0.5;
    this.dragging = true;
    globalDragging = true;
}

//
function onDragEnd(event) {
    this.alpha = 1;
    this.dragging = false;
    this.isOver = false;
    this.data = null;
    this.fx = null;
    this.fy = null;
    globalDragging = false;
    viewport.resumePlugin('drag');
}

//
function onDragMove(event) {
    if (this.dragging) {
        const newPosition = this.eventData.getLocalPosition(this.parent);
        this.fx = newPosition.x;
        this.fy = newPosition.y;
    }
}

//
function handleFileSelect(evt){
    var reader = new FileReader();
    reader.onloadend = function(evt) {
        if (evt.target.readyState == FileReader.DONE) { // DONE == 2
            var data = JSON.parse(evt.target.result)
            loadData(data, viewport, graph, grid);
        }
    };
    reader.readAsBinaryString(evt.target.files[0]);
}

//
function handleSaveData(evt){
    saveData("Data.json", graph, grid);
}

//
function handleRestartGrid(evt){
    resetFloorPlan(grid);
}

//
function handleRestartAll(evt){
    init();
}

//
function handlePause(evt){
    grid.paused = !grid.paused;
}

//
function handleReturnToBest(evt){
    grid.matrix = duplicateMatrix(grid.best_matrix);
    updateGrid(grid);
    updateCost(graph, grid);
    drawGrid(graph, grid)
}

document.getElementById('load').addEventListener('change', handleFileSelect, false);
document.getElementById('save').addEventListener('click', handleSaveData, false);
document.getElementById('restart_grid').addEventListener('click', handleRestartGrid, false);
document.getElementById('restart_all').addEventListener('click', handleRestartAll, false);
document.getElementById('pause').addEventListener('click', handlePause, false);
document.getElementById('return').addEventListener('click', handleReturnToBest, false);

// ****************************************
// UTILS **********************************
// ****************************************
/**
 * @method getRandomColor: Generate a random color in hexadecimal
 * @return {hexadecimal}: Returns a new color in the format of 0xFFFFFF
 */
function getRandomColor() {
    return Math.floor(MathRandom() * 0x1000000);
}

function MathRandom(){
    // Divide a random UInt32 by the maximum value (2^32 -1) to get a result between 0 and 1
    return window.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967295;
}

function printOutput(){
    output.text = "Cost: " + grid.cost.toFixed(2) + "\n" +
        "Access Cost: " + grid.access_cost.toFixed(2) + "\n" +
        "Dimensions Cost: " + grid.dimensions_cost.toFixed(2) + "\n" +
        "Shape Cost: " + grid.shape_cost.toFixed(2) + "\n" +
        "Best Cost: "  + grid.best_cost.toFixed(2) + "\n" +
        "Best At Time: " + grid.found_best_at_time.toFixed(0) + "\n" +
        "Best At Tick: " + grid.found_best_at_tick.toFixed(0) + "\n" +
        "Beta: " + BETA.toFixed(2) + "\n" +
        "Ticks: " + grid.ticks.toFixed(2) + "\n" +
        "Elapsed Time: " + grid.elapsed_time.toFixed(0) + "\n";
}
/**
 * @param array
 */
function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(MathRandom() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

/**
 * @param _default
 * @param _matrix
 */
function resetMatrix(_default, _matrix) {
    for (var i = 0; i < _matrix.length; i++)
        for (var j = 0; j < _matrix[0].length; j++)
            _matrix[i][j] = _default;
}

/**
 * @param value
 * @param _array
 */
function resetArray(value, _array){
    for (var i = 0; i < _array.length; i++)
        _array[i] = value;
}

/**
 * @param array
 * @param item
 * @returns {boolean}
 */
function isItemInArray(array, item){
    for(var i = 0; i < array.length; i++)
        if(array[i][0] == item[0] && array[i][1] == item[1])
            return true;

    return false;
}

/**
 * @param _matrix
 * @returns {[]}
 */
function duplicateMatrix(_matrix) {
    var _duplicate = [];
    for (var i = 0; i < _matrix.length; i++)
        _duplicate[i] = _matrix[i].slice();

    return _duplicate;
}

var startTime = -1
var endTime;

function start() {
    startTime = new Date();
};

function end() {
    if(startTime != -1) {
        endTime = new Date();
        var timeDiff = endTime - startTime; //in ms
        return Math.round(timeDiff);
    }
    return 0;
}
// ****************************************
// SAVE & LOAD DATA ***********************
// ****************************************
/**
 * @param filename
 * @param text
 */
function download(filename, text) {
    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    pom.setAttribute('download', filename);

    if (document.createEvent) {
        var event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
    }
    else {
        pom.click();
    }
}

/**
* @param filename
* @param _graph
* @param _grid
*/
function saveData(filename, _graph, _grid){
    var data_ = {
        graph_x: _graph.x,
        graph_y: _graph.y,
        graph_columns: _graph.columns,
        graph_rows: _graph.rows,
        graph_nodes: _graph.nodes,
        graph_links: _graph.links,
        graph_positions: _graph.positions,
        graph_areas: _graph.areas,
        graph_ratios: _graph.ratios,
        graph_names: _graph.names,
        graph_types: _graph.types,
        graph_colors: _graph.colors,
        grid_x: _grid.x,
        grid_y: _grid.y,
        grid_columns: _grid.columns,
        grid_rows: _grid.rows,
        grid_cell_width: _grid.cell_width,
        grid_cell_height: _grid.cell_height,
        grid_cost: _grid.cost,
        grid_access_cost: _grid.access_cost,
        grid_dimensions_cost: _grid.dimensions_cost,
        grid_shape_cost: _grid.shape_cost,
        grid_best_cost: _grid.best_cost,
        grid_matrix: _grid.matrix,
        grid_best_matrix: _grid.best_matrix,
        grid_ticks: _grid.ticks,
        grid_elapsed_time: _grid.elapsed_time,
        grid_found_best_at_time: _grid.found_best_at_time,
        grid_found_best_at_tick: _grid.found_best_at_tick,
        controls_number_of_rooms: NUMBER_OF_ROOMS,
        controls_epsilon: EPSILON,
        controls_beta: BETA,
        controls_beta_start: BETA_START,
        controls_beta_limit: BETA_LIMIT,
        controls_door_size: DOOR_SIZE,
        controls_ka: KA,
        controls_kd: KD,
        controls_ks: KS,
        controls_kr: KR,
        controls_ko: KO
    };
    var data = JSON.stringify(data_);
    download(filename, data);
}

/**
 * @param data
 * @param _viewport
 * @param _graph
 * @param _grid
 */
function loadData(data, _viewport, _graph, _grid){
    // Update main parameters and controls
    NUMBER_OF_ROOMS = data.controls_number_of_rooms;
    EPSILON = data.controls_epsilon;
    BETA = data.controls_beta;
    BETA_START = data.controls_beta_start;
    BETA_LIMIT = data.controls_beta_limit;
    DOOR_SIZE = data.controls_door_size;
    KA = data.controls_ka;
    KD = data.controls_kd;
    KS = data.controls_ks;
    KR = data.controls_kr;
    KO = data.controls_ko;

    updateControls();
    for (var i in gui.__controllers) {
        gui.__controllers[i].updateDisplay();
    }

    resetViewport(_viewport);
    createGraphFromData(data, _graph, _viewport);
    createGridFromData(data, _graph, _grid, _viewport);
}