// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const riotApi = require('./lib/riot-api.js');
const riotUtils = require('./lib/riot-utils.js');
const dust = require('dustjs-linkedin');
const fs = require('fs');

// riotApi.getItems().then(function(items){
// 	items.forEach(function(item){
// 	});
// });

const champsDiv = document.getElementById('champions');
dust.loadSource(dust.compile(document.getElementById('champTpl').textContent, 'champTemplate'));
dust.loadSource(dust.compile(document.getElementById('champBuildsTpl').textContent, 'buildsTemplate'));
dust.loadSource(dust.compile(document.getElementById('buildsTpl').textContent, 'buildTemplate'));

function createNode(htmlStr) {
    var frag = document.createDocumentFragment(),
        temp = document.createElement('div');
    temp.innerHTML = htmlStr;
    while (temp.firstChild) {
        frag.appendChild(temp.firstChild);
    }
    return frag;
}

function printMainChamps() {
	champsDiv.innerHTML = "";
	riotApi.getChamps().then(function(champs){
		champs
			.forEach(function(champ){
				dust.render('champTemplate', champ, (err, out) => {
					champsDiv.appendChild(createNode(out));
				});
			});
	});
}
printMainChamps();

const {dialog} = require('electron').remote;
var folderPath = ""
var items = null;
riotApi.getItems().then(function(list){
	items = list;
});

document.body.addEventListener("click", function(event){
	var elem = event.target;
	if(elem.matches('#champions .champIcon')){
		var promises = [
			riotUtils.findBuilds(folderPath, elem.dataset.key),
			riotApi.getChamps().then(champs=>champs.find(champ=>champ.key===elem.dataset.key))
		];
		Promise.all(promises).then(results=>{
			var builds = results[0];
			var champ = results[1];
			console.log(builds, champ);
			dust.render('buildsTemplate', {champ:champ, builds: builds}, (err, out) => {
				champsDiv.innerHTML = "";
				champsDiv.appendChild(createNode(out));
			});
		});
	} else if(elem.matches("#selectFolder")){
		var path = dialog.showOpenDialog({properties: ['openDirectory'], defaultPath: 'C:\\Riot Games\\League of Legends\\'})[0];
		if(path) {
			if(fs.existsSync(path+'/Config/Champions')) {
				elem.textContent = path;
				folderPath = path;
			} else {
				alert("`"+path+"` doesn't appear to be a League Of Legends installation.");
			}
		}
	} else if(elem.matches('.buildList .build')){
		console.log(elem.dataset.path);
		var build = JSON.parse(fs.readFileSync(elem.dataset.path, 'utf8'));
		build.blocks = build.blocks.map(block=>{
			block.items = block.items.map(item => {
				var count = item.count;
				item = items.find(i=>i.id == item.id);
				return item;
			}).filter(item=>!!item);
			return block;
		});
		dust.render('buildTemplate', {build: build}, (err, out) => {
			champsDiv.innerHTML = "";
			champsDiv.appendChild(createNode(out));
		});
	} else if(elem.matches('#backToChamps')){
		printMainChamps();
	}
});