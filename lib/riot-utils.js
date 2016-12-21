const imageCDN = "http://ddragon.leagueoflegends.com/cdn/6.24.1/img/";
const fs = require('fs');

function imageUrl(imageDTO){
	return imageCDN + [imageDTO.group, imageDTO.full].join('/');
}

function buildFolder(mainPath, key) {
	return mainPath+'/Config/Champions/'+key+'/Recommended';
}

function findBuilds(mainPath, key) {
	const buildsFolder = buildFolder(mainPath, key);
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

function slugify(text)
{
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

function saveBuild(data, path) {
	if(!path){
		let filename = slugify(data.title)+'.json';
		path = buildFolder() + '/' +filename;
	}
	console.log('saving build');
	fs.writeFileSync(path, JSON.stringify(buildHash(data)));
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
	    				"id": item,
	    				"count": 1
	    			};
	    		})
	    	};
	    })
	};
}

module.exports = {
	imageUrl: imageUrl,
	findBuilds: findBuilds,
	buildFolder: buildFolder,
	saveBuild: saveBuild
};