const imageCDN = "http://ddragon.leagueoflegends.com/cdn/6.24.1/img/";
const fs = require('fs');

function imageUrl(imageDTO){
	return imageCDN + [imageDTO.group, imageDTO.full].join('/');
}

function findBuilds(mainPath, key) {
	const buildsFolder = mainPath+'/Config/Champions/'+key+'/Recommended';
	return new Promise(function(resolve, reject){
		if(!fs.existsSync(buildsFolder)){
			reject('Could not find folder.');
		}
		fs.readdir(buildsFolder, function(err, files) {
			builds = files.map(fileName=>{
				var build = JSON.parse(fs.readFileSync(buildsFolder+'/'+fileName, 'utf8'));
				build.path = buildsFolder+'/'+fileName;
				return build;
			});
			resolve(builds);
		});
	});
}

function buildHash(buildData) {
	return {
		"map": "any",
	    "title": buildData.title,
	    "priority": false,
	    "mode": "any",
	    "type": "custom",
	    "sortrank": 1,
	    "champion": buildData.champion,
	    "blocks": buildData.blocks.map(block => {
	    	return {
	    		"type": block.type,
	    		"items": block.items.map(item => {
	    			return {
	    				"id": item.id,
	    				"count": 1
	    			}
	    		})
	    	}
	    })
	}
}

module.exports = {
	imageUrl: imageUrl,
	findBuilds: findBuilds
};