const spirit = require('../providers/spirit');
const router = require('express-promise-router')();
const co = require('co');
const deploy = require('../private/deploy');
const validateDeploy = require('../private/validateDeploy');
const request = require('request-promise');

router.post('/:name/:secret', co.wrap(function*(req, res, next){
  console.log('deploying', req.params.name, req.body);
  
  const config = yield spirit(req.params.name).config();

  try{
    yield validateDeploy(
      config,
      req.params.name, 
      req.params.secret, 
      req.body.repository && req.body.repository.repo_name, 
      req.headers['x-real-ip'] || req.connection.remoteAddress, 
      req.body.callback_url);
  }catch(error){
    console.log('validation failed for', req.params.name, error);
    res.status('403');
    res.write(JSON.stringify(error, null, ' '));
    res.end();
    return;
  }

  console.log('config is valid');
  
  deployInBackground(config, req.body.callback_url)
  .catch(function(error){
    console.error(error);
  });
  
  res.write('success');
  res.end();
}));

router.use(function(error, req, res, next){
  res.status('500');
  res.write(JSON.stringify(error.message || error, null, ' '));
  res.end();
});

const deployInBackground = co.wrap(function*(config, callback_url){
  const result = yield tryDeploy(config);

  result.context = config.description;
  result.target_url = config.url;

  console.log('responding', result);

  yield request.post({
    url: callback_url,
    body: JSON.stringify(result)
  });
});

function *tryDeploy(config){
  try{
    console.log('deploying');
    
    yield deploy(config);
    
    return {
      state: 'success',
      description: 'deployed'
    };
  }catch(error){
    return {
      state: 'error',
      description: error
    };
  }
}

module.exports = router;