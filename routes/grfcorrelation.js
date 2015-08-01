var express = require('express');
var router = express.Router();
var google = require('googleapis');
var customsearch = google.customsearch('v1');
var eventEmitter = require('events').EventEmitter;
var request = require('request');

const CX = '005099237889008539496:ii4wheeo0kg';
const API_KEY = 'AIzaSyA9-8Pqrtw8GyfyxdH2WvEL7QWerWbI-_s';

const AHREFS_URL = 'http://apiv2.ahrefs.com/?from=metrics_extended&target=';
const AHREFS_QUERY = '&mode=exact&output=json&token=f7d955dd35d5e18c638333a8f133c9bdf46173b5';

/* Calculate GRF correlation with AHREFS metrics. */
router.get('/', function(req, res, next) {
  var keywordList = req.query['keywordList'];
  var ee = new eventEmitter();
  if(!keywordList) {
  	return res.send({status: false, message: 'keywordList is null'});
  }
  keywordList = JSON.parse(keywordList);

  // var searchResults = {};
  keywordsProcessed = 0;
  var correlation = {};
	ee.on('correlation_done', consolidateCorrelation);
	// var startGatheringInfo = process.hrtime();
  for (var i = 0; i < keywordList.length; i++) {
		getGoogleResults(keywordList[i], correlateWithAhrefs);
  	console.log('Requested for google search results for keyword: ' + keywordList[i]);
  }

  function consolidateCorrelation(keyword, correlationPerMetric) {
  	keywordsProcessed++;
  	console.log('keyword processed');
		correlation[keyword] = correlationPerMetric;

  	if(keywordsProcessed === keywordList.length) {
  		res.send({status: true, message: 'Success', correlation: correlation});
  	}
  }

  function getGoogleResults(keyword, callback) {
		customsearch.cse.list({ cx: CX, q: keyword, auth: API_KEY }, function(err, resp) {
		  if(err) {
		    console.log('Error getting google search: ', err);
		    callback(err, keyword, []);
		    return;
		  }
		  if(resp.items && resp.items.length > 0) {
			  var links = [];
			  for (var i = 0; i < resp.items.length; i++) {
			  	links[i] = resp.items[i].link;
			  }
		  	// Get ahrefs metrics for each 
		  	callback(null, keyword, links);
		  } else {
		  	callback('Zero resuts from google search', keyword, [])
		  }
		});
  }

  function correlateWithAhrefs(err, keyword, links) {
  	if(err || links.length === 0) {
  		if(err) {
	  		console.log('Error getting google search results: ' + JSON.stringify(err, null, 2));
	  		ee.emit('correlation_done', keyword, {});
	  		return;
  		}
  		console.log('No results from google search');
  		ee.emit('correlation_done', keyword, {});
  		return;
  	}
  	console.log('Received google search results for keyword: ' + keyword);
  	var metricTable = {};
  	var linksProcessed = 0;
  	var linkErrors = [];
  	for (var i = 0; i < links.length; i++) {
  		linkErrors[i] = false;
  		(function(i) {
  			var link = AHREFS_URL + encodeURIComponent(encodeURI(links[i])) + AHREFS_QUERY;
		    var req = request.get(link, function(err, response, body) {
		      if(err) {
			  		console.log('Error getting ahrefs metrics: ' + JSON.stringify(err, null, 2));
			  		ee.emit('correlation_done', keyword, {});
			  		return;
		      }
		      linksProcessed++;
		      var body = JSON.parse(body);
		      var metrics = body.metrics;
		      if(!metrics) {
		      	linkErrors[i] = true;
			  		console.log('ahrefs metrics is null or undefined, body is : ' + 
			  																											JSON.stringify(body, null, 2));
			  		return;
		      }
		      var metricNames = Object.keys(metrics);
		      for (var j = 0; j < metricNames.length; j++) {
		      	var metricName = metricNames[j];
		      	if(!metricTable[metricName]) {
		      		metricTable[metricName] = [];
		      	}
		      	metricTable[metricName][i] = metrics[metricName];
		      }
		      if(linksProcessed === links.length) {
				    // var delta = process.hrtime(startGatheringInfo);
				    // var deltaInMilSec = (delta[1] + delta[0] * 1e9) / 1e6;
				    // console.log('Time taken to collect information from Google and ahrefs: ' + deltaInMilSec);

		      	// Find correlation
		      	var metricNames = Object.keys(metricTable);
		      	// console.log(JSON.stringify(metricTable, null, 2));
		      	var correlationPerMetric = {};
		      	for (var j = 0; j< linkErrors.length; j++) {
		      		if(linkErrors[j] === true) {
		      			console.log('Keyword: ' + keyword);
		      			console.log('Error getting ahrefs metrics: ' + links[j]);
		      		}
		      	}
		      	for (var j = 0; j < metricNames.length; j++) {
		      		var metricName = metricNames[j];
		      		var unsorted = [];
		      		for (var k = 0; k < metricTable[metricName].length; k++) {
		      			if(linkErrors[k] === true) {
		      				metricTable[metricName].splice(k, 1);
		      				k--;
		      				continue;
		      			}
		      			if(!metricTable[metricName][k]) {
		      				metricTable[metricName][k] = 0;
		      			}
		      			unsorted[k] = metricTable[metricName][k];
		      		}
							metricTable[metricName].sort(function(a,b){return b - a});
		      		var ahrefsRank = [];
			        var countPerTiedRank = {};
			        for (var k = 0; k < unsorted.length; k++) {
		            var rank1 = metricTable[metricName].indexOf(unsorted[k])+1;
		            var rank2 = metricTable[metricName].lastIndexOf(unsorted[k])+1;
		            if (rank1 === rank2) {
	                ahrefsRank[k] = rank1;
		            } else {
	            		ahrefsRank[k] = (rank1 + rank2) / 2;
	            		countPerTiedRank[ahrefsRank[k]] = rank2 - rank1 + 1;
		            }
			        }
			        var sumOfSquaredRankDiffs = 0;
			        for (var k = 0; k < ahrefsRank.length; k++) {
			        	sumOfSquaredRankDiffs += Math.pow((ahrefsRank[k] - (k+1)), 2);
			        }
			        var tiedRanks = Object.keys(countPerTiedRank);
			        var numerator;
			        if(tiedRanks.length === 0) {
				        numerator = sumOfSquaredRankDiffs*6;
			        } else {
			        	var standardDeviationWithCorrectionFactor = sumOfSquaredRankDiffs;
			        	for (var k = 0; k < tiedRanks.length; k++) {
        	    		var m = countPerTiedRank[tiedRanks[k]];
        	    		var cf = m*(Math.pow(m, 2)-1)/12;
        	    		standardDeviationWithCorrectionFactor += cf;
        	    	}
				        numerator = standardDeviationWithCorrectionFactor*6;
			        }
			        var denominator = ahrefsRank.length*(Math.pow(ahrefsRank.length, 2) - 1);
			        var spearmanCorrelation = 1 - (numerator/denominator);
			        correlationPerMetric[metricName] = spearmanCorrelation;
		      	}
				  	ee.emit('correlation_done', keyword, correlationPerMetric);		      	
		      }
		    });
	      req.end();
  		})(i);
  	}
  	console.log('Requested ahrefs metrics for links: \n' + JSON.stringify(links, null, 2));
  }

});

module.exports = router;
