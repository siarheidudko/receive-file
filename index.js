/**
 * Module for download file (use stream methods)
 * @module receive-file
 * @author Siarhei Dudko <slavianich@gmail.com>
 * @copyright 2019-2020
 * @license MIT
 * @version 2.0.1
 * @requires fs
 * @requires url
 * @requires http
 * @requires https
 * @requires path
 */

'use strict'

let Fs = require('fs'),
	Url = require('url'),
	Http = require('http'),
	Https = require('https'),
	Path = require('path');
  
let nodeVers = process.version.substr(1);

/**
  * Compare version function
  * 
  * @private
  * @function
  * @param {string} v1 - first version
  * @param {string} v2 - second version
  * @return {number} n - if v1 > v2 return 1, if v1 < v2 return 0, else return -1
  */
function compareVers(v1, v2){
	if((typeof(v1) !== 'string') 
		|| (typeof(v2) !== 'string')
	){
		return new Error('The arguments passed are not string values!');
	}
	const _v1 = v1.match(/^(\d+\.){0,3}(\d+)/gi);
	const _v2 = v2.match(/^(\d+\.){0,3}(\d+)/gi);
	if(!(Array.isArray(_v1) && (typeof(_v1[0]) === 'string')) 
		|| !(Array.isArray(_v2) && (typeof(_v2[0]) === 'string'))
	){
		return new Error('The arguments passed are not string versions!');
	}
	try{
		const _vn1 = _v1[0].split('.').map(function(arg){ return Number.parseInt(arg, 10); });
		const _vn2 = _v2[0].split('.').map(function(arg){ return Number.parseInt(arg, 10); });
		for(let i = 0; i < _vn1.length; i++){
			if(_vn1[i] > _vn2[i])
				return 1;
			if(_vn1[i] < _vn2[i])
				return -1;
		}
		return 0;
	} catch(err){
		return new Error('Version comparison error:'+err.message);
	}
}

/**
  * Recursive make dir promise
  * 
  * @private
  * @async
  * @function
  * @param {string} path - path to create directories
  * @param {RecursiveMkdirSettings} options - settings to create directories
  * @return {Promise} promise
  */
let promiseMkdir = function(path, obj = {recursive: false, mode: 0o777}){
	if(compareVers(nodeVers, '10.0.0') >= 0){
		return Fs.promises.mkdir(path, obj);
	} else {
		return new Promise((res, rej) => {
			recursiveMkdir(path, obj, function(err){
				if(err){
					rej(err);
				} else {
					res();
				}
			});
		});
	}
}

/**
  * Recursive make dir function
  * 
  * @private
  * @function
  * @param {string} path - path to create directories
  * @param {RecursiveMkdirSettings} options - settings to create directories
  * @param {RecursiveMkdirCallback} callback - callback function
  */
let recursiveMkdir = function(path, obj, callback){
	let _path;
	if(obj.recursive === true){
		_path = path.split(Path.sep);
		while(_path[0] === ''){
			_path = _path.splice(1);
		}
	} else {
		_path = [path];
	}
	try{
		Fs.mkdir(_path[0], {mode: obj.mode}, (err) => {
			if(err && (err.code !== 'EEXIST')) {
				callback(err);
			} else {
				_path = _path.splice(1);
				while(_path[0] === ''){
					_path = _path.splice(1);
				}
				if((_path.length !== 0) && (obj.recursive === true)){
					path = Path.join(_path);
					recursiveMkdir(path, obj, callback);
				} else {
					callback();
				}
			}
		});
	} catch(err){
		callback(err);
	}
}

/**
  * File delete function
  * 
  * @private
  * @async
  * @function
  * @param {string} file - path to delete file
  * @param {Error} msg - Error instance to send to the callback function
  * @param {DeleteFileCallback} callback
  */
let deleteFile = function(file, msg, callback){
	Fs.unlink(file, () => {
		callback(msg);
	});
}
/**
  * File download promise
  * 
  * @private
  * @async
  * @function
  * @param {string} url - file download link
  * @param {ReceiveFileSettings} options - download settings object
  * @param {number} level - iteration number, to avoid cyclic redirect
  * @return {Promise<string>} path - path where the file was downloaded
  */
let receivefile = function(url, options, level = 0){
	let dt = Date.now();
	return new Promise((res, rej) => {
		let path = Path.join(options.directory, options.filename);
		let Req;
		let Options = Url.parse(url);
		if (Options.protocol === 'https:') {
			Req = Https;
		} else {
			Req = Http;
		}
		let request = Req.request(Options,(response) => {
			switch(response.statusCode){
				case 200:
				case 201:
				case 202:
				case 203:
				case 204:
				case 205:
					promiseMkdir(options.directory, {recursive: true, mode: 0o666}).then(() => {
						let filestream = Fs.createWriteStream(path);
						let _timer = options.timeout + dt;
						response.on('data', () => {
							if((_timer - Date.now()) < 0) { request.abort(); }
						}).pipe(filestream);
						filestream.on("finish",() => {
							if((typeof(response.headers['content-length']) === 'string') && (response.headers['content-length'] !== '')){
								Fs.stat(path, (err, stat) => {
									if(err){
										deleteFile(path, err, rej);
									} else if ((typeof(stat) === 'object') && stat.isFile()) {
										if(stat.size.toString() !== response.headers['content-length']){
											deleteFile(path, new Error('File not full!'), rej);
										} else {
											res(path);
										}
									} else {
										deleteFile(path, new Error('Not Found'), rej);
									}
								});
							} else {
								res(path);
							} 
						});
						filestream.on("error",(err) => {
							deleteFile(path, err, rej);
						});
						response.on('aborted', () => {
							response.unpipe(filestream);
							response.destroy();
							filestream.destroy(new Error('Request aborted!'));
						});
					}).catch(rej);
					break;
				case 300:
				case 301:
				case 302:
				case 303:
				case 304:
				case 305:
				case 306:
				case 307:
				case 308:
					if((typeof(response.headers['location']) === 'string') && (level < 3)){
						receivefile(response.headers['location'], options, ++level).then(res).catch(rej);
					} else {
						rej(new Error(response.statusCode + ' - ' + response.statusMessage));
					}
					break;
				default:
					rej(new Error(response.statusCode + ' - ' + response.statusMessage));
					break;
			}
		}).on('timeout', () => {
			request.abort();
		}).on('error', (err) => {
			rej(err);
		});
		let timeout = options.timeout - (Date.now() - dt );
		if(timeout > 0){
			request.setTimeout(timeout);
			request.end();
		} else {
			request.abort();
			rej(new Error('Request aborted with timeout!'));
		}
	});
}

/**
  * File download function
  * 
  * @async
  * @function
  * @param {string} url - file download link
  * @param {ReceiveFileSettings} options - download settings object
  * @param {ReceiveFileCallback} callback - if not set, promise will be returned
  * @return {Promise<string>} path - path where the file was downloaded
  */
let ReceiveFile = function(url, options, callback){
	if ((typeof(callback) !== 'function') && (typeof(options) === 'function')) {
		callback = options;
	}
	if(typeof(options) !== 'object'){
		options = {};
	}
	if(!Number.isInteger(options.timeout)){
		options.timeout = 30000;
	}
	if(typeof(options.directory) !== 'string'){
		options.directory = Path.normalize('.');
	} else {
		options.directory = Path.normalize(options.directory);
	}
	if(typeof(options.filename) !== 'string'){
		let arr = url.split('/');
		options.filename = arr[arr.length - 1];
	}
	if(typeof(url) !== 'string'){
		if(typeof(callback) !== 'function') {
			return Promise.reject(new Error("Need a file url to download"));
		} else {
			callback(new Error("Need a file url to download"));
			return;
		}
	} else if(typeof(callback) !== 'function') {
		return receivefile(url, options, 0); 
	} else {
		receivefile(url, options, 0).then((_path) => { callback(undefined, _path); }).catch((err) => { callback(err); });
		return;
	}
};

/**
 * ReceiveFile Callback Function, if not set, promise will be returned
 *
 * @callback ReceiveFileCallback
 * @param {Error} err - if the request completed with an error, or undefined
 * @param {string} path - if the request is successful, or undefined
 */
 
 /**
 * ReceiveFile Object Settings
 *
 * @namespace ReceiveFileSettings
 * @property {string} directory - directory for download file
 * @property {string} filename - filename for download file
 * @property {number} timeout - download file timeout, milliseconds
 */
 
 /**
 * Delete File Callback Function
 *
 * @private
 * @callback DeleteFileCallback
 * @param {Error} err - instance of Error
 */
 
  /**
 * RecursiveMkdir Object Settings
 *
 * @private
 * @namespace RecursiveMkdirSettings
 * @property {boolean} recursive - Default: false
 * @property {number} mode - Not supported on Windows. Default: 0o777.
 */
 
 /**
 * RecursiveMkdir Callback Function
 *
 * @private
 * @callback RecursiveMkdirCallback
 * @param {Error} err - instance of Error
 */

module.exports = ReceiveFile;