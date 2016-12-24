// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const riotApi = require('./lib/riot-api.js');
const riotUtils = require('./lib/riot-utils.js');
const dust = require('dustjs-linkedin');
const fs = require('fs');
window.$ = window.jQuery = require('jquery');
require('jquery-ui-bundle');
require('tooltipster');

const champsDiv = $('#champions');
const itemBrowserDiv = $('#itemBrowser .main-browser');
dust.loadSource(dust.compile(document.getElementById('champTpl').textContent, 'champTemplate'));
dust.loadSource(dust.compile(document.getElementById('champBuildsTpl').textContent, 'buildsTemplate'));
dust.loadSource(dust.compile(document.getElementById('buildsTpl').textContent, 'buildTemplate'));
dust.loadSource(dust.compile(document.getElementById('itemBrowserTpl').textContent, 'browserTemplate'));
dust.loadSource(dust.compile(document.getElementById('buildItemTpl').textContent, 'buildItemTemplate'));

function printMainChamps() {
	$(champsDiv).html("");
	riotApi.getChamps().then(function(champs){
		champs
			.forEach(function(champ){
				dust.render('champTemplate', champ, (err, out) => {
					$(champsDiv).append($(out));
				});
			});
	});
}
printMainChamps();

function renderStoreItems(items) {
	dust.render('browserTemplate', {items: items}, (err, out) => {
		$(itemBrowserDiv).html($(out));
		attachItemHovers();
	});
}

var allItems = [];
function handleFormUpdate(){
	var searchTerm = $('.form [name=search]').val().toLowerCase();
	var selectedTags = [].slice.call($('#mainTags [type=checkbox]:checked').map(function(){return $(this).val()}));
	var results = allItems;
	if(searchTerm){
		results = results.filter(i=>{
			return i.name.toLowerCase().includes(searchTerm) || i.description.toLowerCase().includes(searchTerm);
		});
	}
	if(selectedTags && selectedTags.length) {
		results = results.filter(i=>{
			return selectedTags.reduce((memo, tag)=>{
				return memo && (i.tags||[]).includes(tag);
			}, true);
		});
	}
	renderStoreItems(results);
}
$('#mainTags [type=checkbox]:checked').map(function(){return $(this).val()});
$('#mainTags [type=checkbox], .form [name=search]').change(handleFormUpdate);
$('.form [name=search]').keyup(handleFormUpdate);

riotApi.getItems().then(items=>{
	allItems = items;
	return items;
}).then(renderStoreItems);

const {dialog} = require('electron').remote;
var folderPath = ""

$('body').on('click', '#champions .champIcon', e=>{
	var elem = e.target;
	var promises = [
		riotUtils.findBuilds(folderPath, elem.dataset.key),
		riotApi.getChamps().then(champs=>champs.find(champ=>champ.key===elem.dataset.key))
	];
	Promise.all(promises).then(results=>{
		var builds = results[0];
		var champ = results[1];
		dust.render('buildsTemplate', {champ:champ, builds: builds}, (err, out) => {
			$(champsDiv).html($(out));
		});
	});
});

$('body').on('click', '#selectFolder', e=>{
	var elem = e.target;
	var path = dialog.showOpenDialog({properties: ['openDirectory'], defaultPath: 'C:\\Riot Games\\League of Legends\\'})[0];
	if(path) {
		if(fs.existsSync(path+'/Config/Champions')) {
			elem.textContent = path;
			folderPath = path;
		} else {
			alert("`"+path+"` doesn't appear to be a League Of Legends installation.");
		}
	}
});

$('body').on('click', '.buildList .build', e=>{
	var elem = e.target;
	if(elem.dataset.path === "new-build") {
		let champFolder = folderPath + '/Config/Champions/'+ elem.dataset.champion+'/Recommended';
		let builds = fs.readdirSync(champFolder);
		let i = 1;
		while(builds.includes(elem.dataset.champion + i + '.json')) {
			i++;
		}
		elem.dataset.path = champFolder + '/' + elem.dataset.champion + i + '.json';
		riotUtils.saveBuild({
			title: elem.dataset.champion + ' ' + i,
			champion: elem.dataset.champion,
			blocks: []
		}, elem.dataset.path);
	}
	var build = JSON.parse(fs.readFileSync(elem.dataset.path, 'utf8'));
	build.blocks = build.blocks.map(block=>{
		block.items = block.items.map(item => {
			var count = item.count;
			item = allItems.find(i=>i.id == item.id);
			return item;
		}).filter(item=>!!item);
		return block;
	});
	dust.render('buildTemplate', {build: build, path: elem.dataset.path, champ: elem.dataset.champion}, (err, out) => {
		$(champsDiv).html($(out));
		attachItemHovers();
		addRemoveItemHander();
	});
});

$('body').on('click', '#backToChamps', e=>{
	printMainChamps();
});

$('body').on('click', 'button[name=saveBuild]', e=>{
	var elem = e.target;
	while(elem && !elem.matches('.build')){
		elem = elem.parentElement;
	}
	if(!elem){
		return alert("something went wrong");
	}
	var path = elem.dataset.path;
	var champKey = elem.dataset.champ;
	var buildData = {
		title: elem.querySelector('[name=buildTitle]').value,
		champion: champKey,
		blocks: [].map.call(elem.querySelectorAll('.blocks .block'), blockEl=>{
			return {
				type: blockEl.querySelector('[name=blockTitle]').value,
				items: [].map.call(blockEl.querySelectorAll('.item'), item=>item.dataset.id)
			}
		})
	};
	riotUtils.saveBuild(buildData, path);
	alert(buildData.title + " has been saved");
});

const blockTpl = '<div class="block"><input name="blockTitle" value="" placeholder="Block Title"/><div class="blockItems"></div></div>';
$('body').on('click', 'button[name=addBlock]', e=>{
	$('.build .blocks').append(blockTpl);
});
function addRemoveItemHander() {
	$('.blocks .block .blockItems .item').on('contextmenu', (event)=>{
		$(event.target).remove();
	});
}

function addDropTargets() {
	$('.blocks .block .blockItems')
		.append('<div class="dropTarget"></div>')
		.find('.dropTarget')
		.droppable({
			drop: function(event, ui){
				var draggable = ui.draggable;
				var itemId = draggable.data('id');
				riotApi.getItems().then(function(items){
					var item = items.find(i=> i.id == itemId);
					dust.render('buildItemTemplate', item, (err, out) => {
						$(event.target).closest('.blockItems').append(out);
						addRemoveItemHander();
					});
				});
			}
		});
}

function removeDropTargets() {
	$('.blocks .block .dropTarget').remove();
}



function attachItemHovers() {
	$('.item').tooltipster();
	$('#itemBrowser .item').draggable({
      containment: '#main',
      stack: '.item',
      cursor: 'move',
      helper: "clone",
      start: addDropTargets,
      stop: removeDropTargets,
      helper: function( event ) {
      	var $el = $(event.target).closest('.item');
      	var id = $el.data('id');
      	var imageUrl = $el.find('img').attr('src');
        return $( '<img class="item" src="'+imageUrl+'" data-id="'+id+'"/>' );
      },
      revert: true
    });
}
