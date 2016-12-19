const request = require('request');
const fs = require('fs');
const riotUtils = require('./riot-utils.js');
const keys = JSON.parse(fs.readFileSync('api-keys.json', 'utf8'));

const baseUrl = "https://global.api.pvp.net/api/";

const region = "na"

function buildUri(path, params) {
	params = params || [];
	params.push("api_key="+ keys.riot);
	return baseUrl + path.replace("{region}", region) + "?" + params.join('&');
}

function objectToArray(obj) {
	return Object.keys(obj).map(function(key){
		var resource = obj[key];
		resource.key = key;
		return resource;
	});
}

function onlySummonersRiftNew(list){
	return list.filter(thing=>thing.maps[11]);
}

function makeRiotRequest(path, params) {
	var url = buildUri(path, params);
	return new Promise(function(resolve, reject){
		request.get(url, function(error, response, body) {
			if (error) {
				reject(error);
			} else {
				resolve(body);
			}
		});
	})
		.then(JSON.parse)
		.then(data=>data.data)
		.then(objectToArray)
		.then(data=>{
			return data.map(thing=>{
				thing.imageUrl=riotUtils.imageUrl(thing.image);
				return thing
			})
		});
}

var cache = {

};

function compareStrings(a, b){
	if(a < b){
		return -1;
	} else if(a>b) {
		return 1;
	} else {
		return 0;
	}
}

function getChamps() {
	var path = "lol/static-data/{region}/v1.2/champion";
	if(!cache.champs) {
		cache.champs = makeRiotRequest(path, ["champData=image,recommended"]).then(data=>
			data.sort((a,b)=>compareStrings(a.name, b.name))
		);
	}
	return cache.champs;
}

function getItems() {
	var path = "lol/static-data/{region}/v1.2/item"
	var params = ["itemListData=effect,gold,image,maps,requiredChampion,sanitizedDescription,tags,tree,from"];
	if(!cache.items) {
		cache.items = makeRiotRequest(path, params).then(onlySummonersRiftNew);	
	}
	return cache.items;
}

module.exports = {
	getChamps: getChamps,
	getItems: getItems
}