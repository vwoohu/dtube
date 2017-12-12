var carousel = require('owl.carousel')

Template.videoslider.isOnMobile = function () {
  if (/Mobi/.test(navigator.userAgent)) {
    return true;
  }
}

Template.videoslider.rendered = function () {
  var random = Template.upload.createPermlink(10)
  this.firstNode.id = random
  Template.videoslider.createSlider(random)
  $(this.firstNode).find('.dropdown').dropdown({});
  Template.settingsdropdown.nightMode();
}

Template.videoslider.createSlider = function (elemId) {
  if (Template.videoslider.isOnMobile() == true) {
    $("#" + elemId).owlCarousel({
      loop: true,
      margin: 2,
      nav: false,
      items: 5,
      slideBy: 2,
      center: true,
      dots: false,
      responsiveClass: true,
      responsive: {
        299: {
          items: 2,
          nav: false,
          slideBy: 2
        },
        499: {
          items: 3,
          nav: false,
          slideBy: 2
        },
        700: {
          items: 3,
          nav: false,
          loop: false,
          slideBy: 2
        }
      }
    });
  }
  else {
    $("#" + elemId).owlCarousel({
      loop: true,
      margin: 2,
      nav: true,
      responsiveBaseElement: document.getElementsByClassName('ui container'),
      navText: [ '', '' ],
      animateOut: 'slideOutDown',
      animateIn: 'flipInX',
      dots: false,
      responsiveClass: true,
      responsive: {
         211: {
           items: 1,
           slideBy: 1,
           nav: false
         },
        399: {
           items: 2,
           slideBy: 2,
          nav: false
         },
         642: {
          items: 3,
          slideBy: 2,
         nav: false
        },
        854: {
          items: 4,
          slideBy: 2,
          nav: false
        },
        1060: {
          items: 5,
          slideBy: 2,
          nav: false,
          nav: false,
          loop: false
        },
        1272: {
          items: 6,
          slideBy: 2,
          nav: false,
          loop: false
        },
        1484: {
          items: 7,
          slideBy: 2,
          nav: false,
          loop: false
        }
      }
    });
  }
}

Template.videoslider.refreshSlider = function () {
  window.dispatchEvent(new Event('resize'))
}