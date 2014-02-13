---
---
var MINI = require('minified'),
_=MINI._, $=MINI.$, $$=MINI.$$, EE=MINI.EE, HTML=MINI.HTML,
acceptedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp'],
maxSize = 3145728,
siteurl = '{{ site.url }}',
clearneturl = '{{ site.clearnet }}',
torurl = '{{ site.tor }}',
i2purl = '{{ site.i2p }}',
thumbs = new Number();

$(function() {
  sjcl.random.startCollectors();
  var cookielang = document.cookie.replace(/(?:(?:^|.*;\s*)lang\s*\=\s*([^;]*).*$)|^.*$/, '$1');
  localizeAll(cookielang);
  changeColor();
  $('#uploadpage').set('-hidden');
  if (window.location.hash.indexOf('!') != '-1') {
    $('#uploadpage').set('hidden');
    $('#loading').set('-hidden');
    var params = window.location.hash.split('!');
    if (window.location.href.indexOf('/autorm/') != '-1') {
      loadFile(params[1],params[2],params[3]);
    }
    else {
      loadFile(params[1],params[2]);
    }
  }
  else if (window.location.href.indexOf('/my/') != '-1') {
    if (localStorage.length) {
      loadThumbs(0);
    }
    else {
       $('#noimages').set('-hidden');
       $('#loadmore').set('+hidden');
    }
  }
  $('#logo').on('mouseover', function() {
    changeColor();
  });
  $('#holder').on('click', function() {
    $('#imageUpload')[0].click();
  });
  $('#imageUpload').on('change', function() {
    previewFiles($('#imageUpload')[0].files);
  });
  $('#holder').on('dragover', function () {
    $('#holder').set('hover');
  });
  $('#holder').on('dragend drop', function () {
    $('#holder').set('-hover');
  });
  $('#holder').on('drop', function (e) {
    previewFiles(e.dataTransfer.files);
  });

  $('#button').on('click', function() {
    $('#button').set('+hidden');
    $('#uploading').set('-hidden');
    uploadFiles();
  });

  $('#remove-button').on('click', function() {
    var params = window.location.hash.split('!');
    removeFile(params[1],params[3]);
    alert('Removed');
    window.location = '/';
  });
  $('#en').on('click', function() {
    localizeAll('en');
    document.cookie = 'lang=en; expires=Sun, 25 May 2042 00:42:00 UTC; path=/'
  });
  $('#ru').on('click', function() {
    localizeAll('ru');
    document.cookie = 'lang=ru; expires=Sun, 25 May 2042 00:42:00 UTC; path=/'
  });
  $('#it').on('click', function() {
    localizeAll('it');
    document.cookie = 'lang=it; expires=Sun, 25 May 2042 00:42:00 UTC; path=/'
  });
  $('#viewpage').on('click', function() {
    if (_.toString($(this).get('@class')) == 'image') {
      $(this).set('+zoom-out -image');
    }
    else {
      $(this).set('+image -zoom-out');
    }
  }, '.imageview img');
});

function changeColor() {
  var colors = ['red', 'green', 'black', 'yellow', 'orange', 'purple', 'grey', 'blue'];
  $('#logo').set(colors[Math.floor(Math.random()*colors.length)]);
}

function localizeAll(lang) {
  String.locale = lang;
  $('[data-l10n]').each(function(elem) {
    $(elem).fill(HTML(l($(elem).get('%l10n'),elem.innerHTML)));
  });
  
  document.documentElement.lang = String.locale;
}

function l(string, fallback) {
	var localized = string.toLocaleString();
	if (localized !== string) {
		return localized;
	}
  else {
		return fallback;
	}
}


function uploadFiles() {
  $('#holder img').each(function(image,count) {
    var pass = randomString(40),
    encrypted = sjcl.encrypt(pass, image.src, {ks:256});
    ethumb = sjcl.encrypt(pass, generateThumb(image.src), {ks:256});
    $.request('post', siteurl + '/api/upload', {encrypted:encrypted,thumb:ethumb})
      .then(function success(txt) {
        var json = $.parseJSON(txt);
        if (json.status == 'OK') {
          $('#viewpage').set('-hidden');
          $('#uploadpage').set('+hidden');
          showImage(image.src,count);
          addLinks(json.id,pass,json.pass,count);
          localStorage.setItem(json.id, JSON.stringify({pass: pass, rmpass: json.pass}));
        }
        else {
          alert(json.status);
        }
      },
      function error(status, statusText, responseText) {
        alert(l('failed-upload','Failed to upload image'));
    });
  });
}

function randomString(length) {
  var charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  i,
  result = '',
  values = sjcl.random.randomWords(length);
  for(i=0; i<length; i++) {
    result += charset[values[i].toString().replace('-','') % charset.length];
  }
  return result;
}

function loadFile(id,pass,rmpass) {
  $.request('get', siteurl + '/download/' + id)
    .then(function success(txt) {
      try {
        var result = sjcl.decrypt(pass,txt),
        data = result.match(/^data:(.+);base64,*/);
        if (acceptedTypes.indexOf(data[1]) != '-1') {
          if (rmpass) {
            removeFile(id,rmpass);
          }
          if (window.location.href.indexOf('rm/') == '-1') {
            addLinks(id,pass,rmpass,0);
          }
          showImage(result,0);
        }
      }
      catch(e) {
        alert(l('failed-decrypt', 'Failed to decrypt image'));
        window.location = '/';
        return;
      }
    },
    function error(status, statusText, responseText) {
      alert(l('failed-load','Failed to load image'));
      window.location = '/';
    });
  
}
function showImage(datauri,count) {
  if (count > 0) {
    $('#viewpage').add($('#viewpage .imageview').only(0).clone());
  }
  $('#loading').set('+hidden');
  $('#viewpage').set('-hidden');
  $('.image').sub(count).set({'@src': datauri, '@class': 'image'});
}

function addLinks(id,pass,rmpass,count) {
  if (count > 0) {
    $('#viewpage').add($('#viewpage .inputs').only(0).clone());
  }
  $('.link-view').sub(count).set('@value',siteurl + '/#!' + id + '!' + pass);
  $('.embed').sub(count).set('@value','<img data-imgbi="' + siteurl + '/#!' + id + '!' + pass + '" />');
  if (rmpass) {
    $('.rmlinks').set('-hidden');
    $('.link-remove').sub(count).set('@value',siteurl + '/rm/#!' + id + '!' + pass + '!' + rmpass);
    $('.link-auto-remove').sub(count).set('@value',siteurl + '/autorm/#!' + id + '!' + pass + '!' + rmpass);
  }
  $('.button-web').on('click', function() {
    $('.nav-tabs li').set('-active');
    $('.button-web').set('+active');
    changeURL(clearneturl);
  });
  $('.button-tor').on('click', function() {
    $('.nav-tabs li').set('-active');
    $('.button-tor').set('+active');
    changeURL(torurl);
  });
  $('.button-eep').on('click', function() {
    $('.nav-tabs li').set('-active');
    $('.button-eep').set('+active');
    changeURL(i2purl);
  });
}

function previewFiles(files) {
  for (var i = 0; i < files.length; i++) {
    if (acceptedTypes.indexOf(files[i].type) != '-1') {
      if (files[i].size < maxSize) {
        var reader = new FileReader();
        reader.onload = function (event) {
          $('#help').remove();
          $('#holder').add(EE('img', {'@src':event.target.result}));
        };
        reader.readAsDataURL(files[i]);
      }
      else {
        alert(l('filesize','Sorry, filesize over 3 MiB is not allowed'));
      }
    }
    else {
      alert(file.type + ': ' + l('filetype','sorry, filetype not supported'));
    }
  }
}

function removeFile(id,rmpass) {
  $.request('get', siteurl + '/api/remove', {id:id,password:rmpass})
    .then(function success(txt) {
      var json = $.parseJSON(txt);
      if (json.status == 'Success') {
        localStorage.removeItem(id);
        return true;
      } else {
        alert(l('failed-remove', 'Failed to remove image') + ': ' + json.status);
      }
    },
    function error(status, statusText, responseText) {
      alert(l('failed-remove', 'Failed to remove image'));
    });
}

function changeURL(url) {
  $('.link-view').each(function(elem) {
    $(elem).set('@value',_.toString($(elem).get('@value')).replace(/^https?:\/\/.*?\//,url + '/'));
  });
  $('.embed').each(function(elem) {
    $(elem).set('@value',_.toString($(elem).get('@value')).replace(/https?:\/\/.*?\//,url + '/'));
  });
  $('.link-remove').each(function(elem) {
    $(elem).set('@value',_.toString($(elem).get('@value')).replace(/^https?:\/\/.*?\//,url + '/'));
  });
  $('.link-auto-remove').each(function(elem) {
    $(elem).set('@value',_.toString($(elem).get('@value')).replace(/^https?:\/\/.*?\//,url + '/'));
  });
}

function generateThumb(uri) {
  var img = new Image();
  img.src = uri;
  var thumbsize = 300,
  c = document.createElement('canvas'),
  cx = c.getContext('2d'),
  widthratio = img.width / thumbsize,
  heightratio = img.height / thumbsize,
  maxratio = Math.max(widthratio, heightratio);
  if (maxratio > 1) {
    w = img.width / maxratio;
    h = img.height / maxratio;
  } else {
    w = img.width;
    h = img.height;
  }
  c.width = w;
  c.height = h;
  cx.fillStyle = 'white';
  cx.fillRect (0, 0, w, h);
  cx.drawImage(img, 0, 0, w, h);
  return c.toDataURL('image/jpeg',0.85);
};

function getThumb(count) {
  var id = localStorage.key(count),
  json = $.parseJSON(localStorage.getItem(id));
  $.request('get', siteurl + '/download/thumb/' + id)
    .then(function success(txt) {
      try {
        var result = sjcl.decrypt(json.pass,txt),
        data = result.match(/^data:(.+);base64,*/);
          if (data[1] == 'image/jpeg' && result) {
            $('#thumbs').add(HTML(
              '<div class="col-md-3"><div class="thumbnail">' +
              '<a href="' + siteurl + '/#!' + id + '!' + json.pass + '">' +
              '<img src="' + result + '" ></a>' +
              '<div class="caption text-center"><p>' +
              '<a href="' + siteurl + '/#!' + id + '!' + json.pass +
              '" class="btn btn-primary btn-sm view-button" role="button" data-l10n="view-btn">' + l('view-btn', 'View') + '</a>' +
              '<a href="' + siteurl + '/rm/#!' + id + '!' + json.pass + '!' + json.rmpass +
              '" class="btn btn-default btn-sm remove-button" role="button" data-l10n="remove-btn">' + l('remove-btn', 'Remove') + '</a>'+
              '</p></div></div></div>'
            ));
          }
        }
      catch(e) {
        localStorage.removeItem(id);
        return;
      }
    },
    function error(status, statusText, responseText) {
      if (status == 404) {
        localStorage.removeItem(id);
      }
    });
}

function loadThumbs(count) {
  for (var i = count; i < count+8 && i < localStorage.length; i++) {
    getThumb(i);
  }
  if (count+8 >= localStorage.length) {
    $('#loadmore').set('+hidden');
  }
  thumbs=thumbs + count;
  $('#loadmore').on('click', function() {
    loadThumbs(thumbs+8);
  });
}