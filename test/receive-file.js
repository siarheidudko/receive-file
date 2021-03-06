"use strict"

require('mocha');

let Path = require('path'),
	Fs = require('fs'),
	Download = require('../index.js');

describe('Test normal (status 200):', function() {
	this.timeout(60000);
	let url = "http://ftp.byfly.by/test/10Mb.txt";
	it('with callback', function(done){
		let options = {
			directory: "./tmp/",
			filename: "10mb.file1"
		}
		let pt = Path.join(options.directory, options.filename);
		Download(url, options, function(err, p){
			if(err){
				done(err);
			} else {
				if(p === pt){
					Fs.unlink(pt, () => {
						done();
					});
				} else {
					Fs.unlink(pt, () => {
						done(new Error(p + ' !== ' + pt));
					});
				}
			}
		});
	});
	it('with promise', function(done){
		let options = {
			directory: "./tmp/",
			filename: "10mb.file2"
		}
		let pt = Path.join(options.directory, options.filename);
		Download(url, options).then((p) => {
			if(p === pt){
				Fs.unlink(pt, () => {
					done();
				});
			} else {
				Fs.unlink(pt, () => {
					done(new Error(p + ' !== ' + pt));
				});
			}
		}).catch((err) => {
			if(err) {
				done(err);
			} else {
				done(new Error('Failed!'));
			}
		});
	});
});

describe('Test error (status 404):', function() {
	this.timeout(60000);
	let url = "http://ftp.byfly.by/test/10Mb.txtdsdfsdafdasfdasfdasfdasfdas";
	it('with callback', function(done){
		let options = {
			directory: "./tmp/",
			filename: "10mb.file1"
		}
		Download(url, options, function(err, p){
			if(err && err.message === '404 - Not Found'){
				done();
			} else if(err) {
				done(err);
			} else {
				Fs.unlink(pt, () => {
					done(new Error('Request finished!'));
				});
			}
		});
	});
	it('with promise', function(done){
		let options = {
			directory: "./tmp/",
			filename: "10mb.file2"
		}
		Download(url, options).then((p) => {
			Fs.unlink(pt, () => {
				done(new Error('Request finished!'));
			});
		}).catch(function(err){
			if(err && err.message === '404 - Not Found'){
				done();
			} else if(err) {
				done(err);
			} else {
				done(new Error('Failed!'));
			}
		});
	});
});

describe('Test w/o options:', function() {
	this.timeout(60000);
	it('status 200', function(done){
		let url = "http://ftp.byfly.by/test/10Mb.txt";
		let options = {
			directory: ".",
			filename: "10Mb.txt"
		}
		let pt = Path.join(options.directory, options.filename);
		Download(url, function(err, p){
			if(err){
				Fs.unlink(pt, () => {
					done(err);
				});
			} else {
				if(p === pt){
					Fs.unlink(pt, () => {
						done();
					});
				} else {
					Fs.unlink(pt, () => {
						done(new Error(p + ' !== ' + pt));
					});
				}
			}
		});
	});
	it('status 404', function(done){
		let url = "http://ftp.byfly.by/test/fdfadsafasf.txt";
		let options = {
			directory: ".",
			filename: "fdfadsafasf.txt"
		}
		Download(url, function(err, p){
			if(err && err.message === '404 - Not Found'){
				done();
			} else if(err) {
				done(err);
			} else {
				Fs.unlink(pt, () => {
					done(new Error('Failed!'));
				});
			}
		});
	});
});

describe('Test timeout:', function() {
	this.timeout(60000);
	let errors = [
		"socket hang up",
		"Request aborted with timeout!",
		"Request aborted!"
	];
	let timeouts = [ -5, 5, 8, 10, 15, 20, 30, 50, 100, 500, 1000 ];
	let nextStep = function(i = 0){
		it('timeout '+timeouts[i]+'ms', function(done){
			let url = "http://ftp.byfly.by/test/500Mb.txt";
			let options = {
				timeout: timeouts[i],
				directory: './tmp/',
				filename: '100Mb-'+timeouts[i]+'.txt'
			}
			Download(url, options, function(err, p){
				if(err && (errors.indexOf(err.message) !== -1)){
					done();
				} else if(err) {
					done(err);
				} else {
					Fs.unlink(pt, () => {
						done(new Error('Request finished!'));
					});
				}
			});
		});
	}
	for(let k = 0; k < timeouts.length; k++) nextStep(k);
});

describe('Test https:', function() {
	this.timeout(300000);
	it('status 301', function(done){
		let url = "https://github.com/siarheidudko/itpharma-vnc-viewer/releases/download/1.1.2/ITPharma.VNC.Viewer.v1.1.2.Setup.exe";
		let options = {
			directory: "./tmp/",
			filename: "ITPharmaVNCViewer_v1.1.2_Setup.exe",
			timeout: 300000
		}
		let pt = Path.join(options.directory, options.filename);
		Download(url, options, function(err, p){
			if(err){
				Fs.unlink(pt, () => {
					done(err);
				});
			} else {
				if(p === pt){
					Fs.unlink(pt, () => {
						done();
					});
				} else {
					Fs.unlink(pt, () => {
						done(new Error(p + ' !== ' + pt));
					});
				}
			}
		});
	});
});