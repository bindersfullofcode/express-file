'use strict';

var Promise = require('bluebird');
var express = require('express');
var multer = require('multer');
var sqlite3 = require('sqlite3');


var app = express();
var db = Promise.promisifyAll(new sqlite3.Database('files.sqlite3'));
var upload = multer({
  storage: multer.memoryStorage()
});

db.serializeAsync()
  .then(function() {
    return db.runAsync('CREATE TABLE IF NOT EXISTS file \
		(file_id INTEGER PRIMARY KEY ASC, filename TEXT, type TEXT, content BLOB)');
  })
  .then(function() {
    app.get('/', function(req, res) {
      return res.json({
        message: 'Welcome to the FileAPI!'
      });
    });

    app.get('/files', function(req, res) {
      db.allAsync('SELECT file_id AS fileId, type, filename FROM file', [])
        .then(function(results) {
          return res.json({
            files: results
          })
        })
        .catch(function(err) {
          res.status(500)
          return res.json({
            message: err.message
          })
        });
    });

    app.post('/files', upload.single('file'), function(req, res) {
      if (!req.file) {
        res.status = 400;
        return res.json({
          message: 'A file is required.'
        });
      }

      db.runAsync('INSERT INTO file (filename, type, content) VALUES (?, ?, ?)', [req.file.originalname, req.file.mimetype, req.file.buffer])
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

    app.get('/files/:fileId', function(req, res) {
      db.getAsync('SELECT file_id as fileAd, type, content FROM file \
			 WHERE file_id = ?', [req.params.fileId])
        .then(function(result) {
          res.set('Content-Type', result.type)
          return res.send(result.content);
        })
        .catch(function(err) {
          res.status(404);
          return res.json({
            message: 'File Not Found'
          });
        });
    });

		app.use(function(err, req, res, next) {
			res.status(500);
			return res.json({
				message: err.message
			})
		});

    var server = app.listen(3000, function() {
      var host = server.address().address;
      var port = server.address().port;

      console.log('File REST API listening at http://%s:%s', host, port);
    });
  })
  .catch(function(err) {
    console.error(err);
  });
