var API_GRF_CORRELATION = '/grfcorrelation';

// Helper funtions

// Communication with Server
function get(endpoint, callback) {
  return $.ajax({
    url: endpoint,
    type: 'GET',
    success: function(data) {
      callback(null, data); 
    },
    error: function (xhr, ajaxOptions, err) {
      err.xhr = xhr;
      err.ajaxOptions = ajaxOptions;
      callback(err, null);
    }
  });
}

// function post(endpoint, data, callback) {
//   return $.ajax({
//     url: endpoint,
//     type: 'POST',
//     data: data,
//     success: function(data) {
//       callback(data); 
//     }
//   });
// }

function init() {

  // $('#overlay').css({
  //   opacity : 0.5,
  //   top     : $('#correlation-table').offset().top,
  //   width   : $('#correlation-table').outerWidth(),
  //   height  : $('#correlation-table').outerHeight()
  // });

  // $('#img-load').css({
  //   top  : ($('#correlation-table').height() / 2),
  //   left : ($('#correlation-table').width() / 2)
  // });

  $('form#grf_correlation button[type="submit"]').click(function(e) {
    e.preventDefault();
    $('#output').removeClass('hide');
    $('#correlation-table').addClass('hide');
    $("#overlay").fadeIn();
    var keywordList = $(this).parent().find('textarea').val().split(/\n/g);
    for (var i = 0; i < keywordList.length; i++) {
      keywordList[i] = keywordList[i].trim();
      // keywordList[i] = keywordList[i].replace(/[\s]+/g, ' ').trim();
      if(keywordList[i].length === 0) {
        keywordList.splice(i, 1);
        i--;
        continue;
      }
      if(keywordList[i].length > 1024) {
        $("#overlay").fadeOut();
        $('#output').addClass('hide');
        var msg = 'Invalid input. Please keep each keywords shorter than 1024 letters.';
        $('#error-form #error #msg p').text(msg);
        $('#error-form').modal('show');
        return false;
      }
    }
    get(API_GRF_CORRELATION + '?keywordList=' + JSON.stringify(keywordList), function(err, data) {
      if(err) {
        $("#overlay").fadeOut();
        $('#output').addClass('hide');
        console.log(xhr.url);
        console.log(xhr.status);
        var msg = 'Oops, somthing went wrong at the server. Please refresh the page.';
        $('#error-form #error #msg p').text(msg);
        $('#error-form').modal('show');
        return false;
      }
      if(data.status === false) {
        $("#overlay").fadeOut();
        $('#output').addClass('hide');
        $('#error-form #error #msg p').text(data.message);
        $('#error-form').modal('show');
        return false;  
      }
      // show data below
      // $('#error-form #error #msg p').text(data.message);
      // $('#error-form').modal('show');
      console.log('Got the grf_correlation');
      var table = $('#output #correlation-table');
      var tableHeaderHTML = '<tr><th>Keywords</th>';
      var tableHeaders = Object.keys(data.correlation[keywordList[0]]);
      for (var i = 0; i < tableHeaders.length; i++) {
        var tableHeader = tableHeaders[i];
        tableHeaderHTML += '<th>' + tableHeader + '</th>';
      }
      tableHeaderHTML += '/tr';
      $(table).find('thead').html(tableHeaderHTML);

      var tableRowsHTML = '';
      for (var i = 0; i < keywordList.length; i++) {
        tableRowsHTML += '<tr>';
        tableRowsHTML += '<td class="text-center">' + keywordList[i] + '</td>';
        for (var j = 0; j < tableHeaders.length; j++) {
          tableRowsHTML += '<td class="text-right">';
          tableRowsHTML += Math.round(data.correlation[keywordList[i]][tableHeaders[j]] * 100) / 100;
          tableRowsHTML += '</td>';
        }
        tableRowsHTML += '</tr>';
      }
      $(table).find('tbody').html(tableRowsHTML);

      $("#overlay").fadeOut();
      $('#correlation-table').removeClass('hide');
      console.log(JSON.stringify(data.correlation, null, 2));
    });
  });

  $('form#grf_correlation textarea').focus(function() {
    if ( $(this).attr('placeholder') ) {
      $(this).data('placeholder', $(this).attr('placeholder'));
      $(this).removeAttr('placeholder');
    }
  });

  $('form#grf_correlation textarea').blur(function() {
    if ( $(this).data('placeholder') ) {
      $(this).attr('placeholder', $(this).data('placeholder'));
      $(this).removeData('placeholder');
    }
  });

}

$(document).ready(function() {
  console.log('Client app code');
  init();
});
