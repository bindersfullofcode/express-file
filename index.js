'use strict';

var Promise = require('bluebird');
var express = require('express');
var humps = require('humps');
var multer = require('multer');
var sqlite3 = require('sqlite3');

var upload = multer({
  storage: multer.memoryStorage()
});
var app = express();
var db = Promise.promisifyAll(new sqlite3.Database('image.sqlite3'));

db.serializeAsync()
  .then(function() {
    return db.runAsync('CREATE TABLE IF NOT EXISTS image \
		(image_id INTEGER PRIMARY KEY ASC, filename TEXT, type TEXT, image BLOB)');
  })
  .then(function() {
    app.get('/', function(req, res) {
      return res.json({
        message: 'Welcome to the imageAPI!'
      });
    });

    app.get('/images', function(req, res) {
      db.allAsync('SELECT image_id, type, filename FROM image', [])
        .then(function(results) {
          var images = humps.camelizeKeys(results);
          return res.json({
            images: images
          })
        })
        .catch(function(err) {
          res.status(500)
          return res.json({
            message: err.message
          })
        });
    });

    app.post('/images', upload.single('image'), function(req, res) {
      if (!req.file) {
        res.status = 400;
        return res.json({
          message: 'An image is required.'
        });
      }

			db.runAsync('INSERT INTO image (filename, type, image) VALUES (?, ?, ?)',
				[req.file.originalname, req.file.mimetype, req.file.buffer])
        .then(function() {
					// FIXME: Find a way to bind this to promise callback to get
					// this.lastID. Or maybe use q-sqlite3
          res.json({
            message: 'Success!'
          })
        })
        .catch(function(err) {
          res.status = 500;
          return res.json({
            message: err.message
          });
        });
    });

    app.get('/images/:imageId', function(req, res) {
      db.getAsync('SELECT image_id, type, image FROM image WHERE image_id = ?', [req.params.imageId])
        .then(function(result) {
          res.set('Content-Type', result.type)
          return res.send(result.image);
        })
        .catch(function(err) {
          res.status(404);
          return res.json({
            message: 'Image Not Found'
          });
        });
    });

    var server = app.listen(3000, function() {
      var host = server.address().address;
      var port = server.address().port;

      console.log('Image Uploader listening at http://%s:%s', host, port);
    });
  })
  .catch(function(err) {
    console.error(err)
  });
