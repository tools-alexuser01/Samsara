var express = require('express');
var router = express.Router();
var docker = require('../private/docker');

router.get('/', function(req, res, next) {
  docker.listContainers()
  .then(function (containers) {
    res.render('index', { title: 'Containers', containers: containers });
  }).catch(function(err){
    console.log(err);
    res.render('error', {message: err.message, error: err});
  });
});

module.exports = router;
