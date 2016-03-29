//global scope variables
var request = {
	location: {lat:38.62700,lng:-90.19940},
	radius: 200,
	query: 'winery'
},
	map,
	infoWindow,
	marker,markers=[],
	clickedVenue = {},

	fsURI = '',
	windowStr = '',
	filteredArray=[],filteredMarkerPos;

//viewmodel for the application
var MapViewModel = function() {
	var self = this;
    var geocoder = new google.maps.Geocoder();

    document.getElementById('submit').addEventListener('click', function() {
          self.geocodeAddress(geocoder, map);
    });
    
    self.geocodeAddress = function(geocoder, resultsMap) {
        var address = document.getElementById('address').value;
        geocoder.geocode({'address': address}, function(results, status) {
          if (status === google.maps.GeocoderStatus.OK) {
            resultsMap.setCenter(results[0].geometry.location);
            
            request.location = {lat:results[0].geometry.location.lat(),
                                lng:results[0].geometry.location.lng()};
            self.searchTxt('');
            self.venuesArray([]);
            self.clearAllMarkers();
            markers = [];
            self.runQuery(map);
          } else {
            alert('Geocode was not successful for the following reason: ' + status);
          }
        });
      },
	self.runQuery = function(map){
		//runs PlacesServiceStatus.textSearch() method for request.query
		var service = new google.maps.places.PlacesService(map);
		service.textSearch(request,self.callback);
	},

	self.callback = function(resultsFromQuery,status){
		if (status === google.maps.places.PlacesServiceStatus.OK){
            //console.log(resultsFromQuery);
			for (i = 0,len = resultsFromQuery.length; i < len; i++){
				self.pushVenuesArray(resultsFromQuery[i]);
				self.createMarker(resultsFromQuery[i]);

			}
		}
	},
	//fills in the observable array of places for every result from
	//PlacesServiceStatus.textSearch() method
	self.pushVenuesArray = function(place){
        /*console.log(place.name)
        console.log('------');
        console.log(place)
        console.log('------');*/
		self.venuesArray.push(place.name);
	},
	//creates marker and infowindow on clicking marker
	//also enable list view of the places returned back by
	//PlacesServiceStatus.textSearch() method
	self.createMarker = function(place){
		placeLoc = place.geometry.location;
		marker = new google.maps.Marker({
			map : map,
			position : placeLoc,
			animation: google.maps.Animation.DROP,
			cursor: 'help'
		});

		self.doAjaxCall(place,marker);
		markers.push(marker);
	},//CLOSES createMarker

	self.doAjaxCall = function(place,marker){
       var 	fsClientID = '44I1K1WPRHS4J0I1JH4KQE3XJGLNMZH3V5JRZBYMS5LD2M2N',
	       fsClientSecret = 'LM3QTMM44PK2PRHZCZR50TBMBDCONAWE5SRCFZYDDXPCIPKW'

		//FourSquare Search API uses following URI structure
		fsURI = 'https://api.foursquare.com/v2/venues/search?client_id='+ fsClientID + '&client_secret=' + fsClientSecret + '&v=20150915&ll=' + place.geometry.location.lat()
		+ ',' + place.geometry.location.lng() +
		'&query=' + place.name + '&limit=1';
        
		$.getJSON(fsURI,function(data){
				venuesDetails = data.response.venues[0];

				if (venuesDetails){
					self.venueAddress(venuesDetails.location.hasOwnProperty('address') ? venuesDetails.location.address : 'Address not found');
					
                    self.venueURL(venuesDetails.hasOwnProperty('url') ? venuesDetails.url : 'URL not found');

					if (self.venueURL() === 'URL not found'){
						//console.log("entered")
						windowStr = '<span class="place">' + place.name +'</span>' + '<div class="window-container">Information on FourSquare:<span class="fs-info"><p class="address"> Address: '+ self.venueAddress() +'</p>'
						+ '<span>URL: ' + self.venueURL() +'</span>' + '<p class="type"> Type: '+ venuesDetails.categories[0].name  +'</p></span></div>' ;
					}
					else{
						windowStr = '<span class="place">' + place.name +'</span>' + '<div class="window-container">Information on FourSquare:<span class="fs-info"><p class="address">Address: '+ self.venueAddress() +'</p>'
						+ '<a href=' + self.venueURL() + '>' + self.venueURL() +'</a>' + '<p class="type"> Type: '+ venuesDetails.categories[0].name  +'</p></span></div>';
					}
				}
				else{
					console.log(place.name + ' is not found in FourSquare database');
					windowStr = place.name + '<p class="window-container">Place is not found in FourSquare database</p>';
				}
				marker.windowStrProp = windowStr;
				google.maps.event.addListener(marker,'click',function(marker,windowStr){
					return function(){
						marker.setAnimation(google.maps.Animation.BOUNCE);
						setTimeout(function(){marker.setAnimation(null); }, 1500);
						//marker.setIcon('http://maps.google.com/mapfiles/ms/icons/green-dot.png');
						infoWindow.setContent(windowStr);
						infoWindow.open(map,this);
					};
				}(marker,windowStr));


			}).error(function(e){
					document.getElementById("error").innerHTML = "<h4 style='color: #fff'>Foursquare data is unavailable. Please try refreshing later.</h4>"
			});
		},

	/* now start the observable properties for data-binding,
	the search function and event handlers for mouseover
	and mouseout events
	*/
	self.searchTxt = ko.observable(''),
	self.venuesArray = ko.observableArray([]),
	self.markerArray = ko.observableArray([]),
	self.venueAddress = ko.observable(''),
	self.venueURL = ko.observable(''),
	self.setAllMarkers = function(map){
		for (var i = 0; i < markers.length; i++) {
			markers[i].setMap(map);
		}
	},
	self.setOneMarker = function(pos){
		markers[pos].setMap(map);
		self.markerArray.push(markers[pos]);

	},
	self.clearAllMarkers = function(){
		self.setAllMarkers(null);
		self.markerArray([]);
	},
	self.filteredSearch = function(){
		var filter = self.searchTxt().toLowerCase();
		if (!filter){
			//set all markers if no filter
			self.setAllMarkers(map);
			self.markerArray(markers);
			return self.venuesArray();
		} else {
			self.clearAllMarkers();
			filteredArray = [];
			//using Knockout's utility function for live search
			//http://www.knockmeout.net/2011/04/utility-functions-in-knockoutjs.html
			return ko.utils.arrayFilter(this.venuesArray(),function(venue){

				if(venue.toLowerCase().indexOf(filter.toLowerCase()) >= 0) {
					//push that venue into another array
					filteredArray.push(venue);
					//finds position of the venue from the observable array
					filteredMarkerPos = self.venuesArray().indexOf(venue);
					//set another marker for the filtered venue
					self.setOneMarker(filteredMarkerPos);
					return filteredArray;
				}
			});
		}
	},
	//enables animation of marker when a user moves mouse
	//over a list item
	self.overVenueItem = function(index){
		clickedVenue = self.markerArray()[index];
		if (clickedVenue.getAnimation() !== null) {
				clickedVenue.setAnimation(null);
		} else {
			clickedVenue.setAnimation(google.maps.Animation.BOUNCE);
		}
	},
	//enables animation of marker when a user moves mouse
	//out of a list item
	self.outVenueItem = function(index){
		clickedVenue.setAnimation(null);
	},
	self.clickVenueItem = function(index){
		clickedVenue = self.markerArray()[index];

		infoWindow.setContent(clickedVenue.windowStrProp);
		infoWindow.open(map,clickedVenue);


		clickedVenue.setAnimation(google.maps.Animation.BOUNCE);
		setTimeout(function(){
			clickedVenue.setAnimation(null);
		}, 800);
		//setTimeout(function(){infowindow.close(); }, 1400);
	};

	google.maps.event.addDomListener(window, 'load', self.runQuery(map));


};//CLOSES mapViewModel

//is a callback which is called on first loading of google map API
function initMap(){
	"use strict";
	//JS literal object to hold map properties
	var mapOptions = {
		center: request.location,
		zoom: 9
	},
	elemMap = document.getElementById('map');

	//map is an instance of Map class created using 'new' operatoe
	//on Map() function constructor
	map = new google.maps.Map(elemMap, mapOptions);
	infoWindow = new google.maps.InfoWindow();

	//RESIZING MAP
    google.maps.event.addDomListener(window,'resize', function(){
        var center = map.getCenter();
        google.maps.event.trigger(map,'resize');
        map.setCenter(center);
    });
    
    


	ko.applyBindings(new MapViewModel());
}


// Inform the user if google maps doesn't load
function googleError() {
	"use strict";
	document.getElementById('map').innerHTML = "<h3 style='color: #fff'>Google Maps is not loading. Please try loading the page again.</h3>";
}