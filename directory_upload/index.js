'use strict';

var path = require('path');
var uploadPath = path.join(__dirname, './files');

var Promise = require('bluebird');
var express = require('express');
var multer = require('multer');
var sqlite3 = require('sqlite3');


var app = express();
var db = Promise.promisifyAll(new sqlite3.Database('files.sqlite3'));
var upload = multer({
  storage: multer.diskStorage({
    destination: uploadPath
  }),
  limits: {
    fileSize: 2 * 1024 * 1024
  }
});

db.serializeAsync()
  .then(function() {
    return db.runAsync('CREATE TABLE IF NOT EXISTS file \
		(file_id INTEGER PRIMARY KEY ASC, filename TEXT, filehash TEXT, type TEXT, path TEXT)');
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
      console.log(req.file)
      if (!req.file) {
        res.status = 400;
        return res.json({
          message: 'A file is required.'
        });
      }
      console.log(uploadPath);

      db.runAsync('INSERT INTO file (filename, filehash, type, path) VALUES (?, ?, ?, ?)', [req.file.originalname, req.file.filename, req.file.mimetype, uploadPath])
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
      db.getAsync('SELECT file_id as fileId, type, filename, filehash, path FROM file \
			 WHERE file_id = ?', [req.params.fileId])
        .then(function(result) {
          return res.sendFile(result.filehash, {
            root: uploadPath,
            dotfiles: 'deny',
            headers: {
              'Content-Type': result.type,
              'Content-Disposition': '"attachment"; filename="' + result.filename + '"'
            }
          }, function(err, result) {
            if (err) {
              console.log(err);
              return res.status(err.status).end();
            }
          });
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
