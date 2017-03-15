function convertToSlick()
    	{
    		$('.social-feed-container').slick({
				slidesToShow: 4,
			    slidesToScroll: 4,
			    arrows: false,
			    infinite: false,
			    dots: true,
			  	responsive: [
			      {
			        breakpoint: 1280,
			        settings: {
			          slidesToShow: 4,
			          slidesToScroll: 4,
			        }
			      },
			      {
			        breakpoint: 600,
			        settings: {
			          slidesToShow: 2,
			          slidesToScroll: 2
			        }
			      },
			      {
			        breakpoint: 480,
			        settings: {
			          slidesToShow: 1,
			          slidesToScroll: 1
			        }
			      }
			      // You can unslick at a given breakpoint now by adding:
			      // settings: "unslick"
			      // instead of a settings object
			    ]
        	});
    	}

    	function countDownNextEvent(event, current)
    	{

			
			// Update the count down every 1 second
			window.duration_interval = setInterval(function() {
    		var countDownDate = new Date(event).getTime();

			  	// Get todays date and time
			  	var now = new Date().getTime();

			  	// Find the distance between now an the count down date
			  	var distance = countDownDate - now;

			  	// Time calculations for days, hours, minutes and seconds
			  	var days = Math.floor(distance / (1000 * 60 * 60 * 24));
			  	var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
			  	var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
			  	var seconds = Math.floor((distance % (1000 * 60)) / 1000);
			  	$('.countdown.days').text(days)
			  	$('.countdown.hours').text(hours)
			  	$('.countdown.minutes').text(minutes)
			  	$('.countdown.seconds').text(seconds)

			  	// If the count down is finished, write some text 
			  	if (distance < 0) {
			    	clearInterval(window.duration_interval);
			  	}
			}, 1000);
    	}
    	function sortBasedOnEventStart(a,b)
    	{
          if (moment(a.start_time).unix() < moment(b.start_time).unix() )
            return -1;
          if ( moment(a.start_time).unix() > moment(b.start_time).unix() )
            return 1;
          return 0;
    	}

    	$(document).ready(function(){
    		$('.social-feed-container').socialfeed({
				facebook:{
			        accounts: ['@badminton.cplusco'],  //Array: Specify a list of accounts from which to pull wall posts
			        access_token: '1519286481659615|f107fae6b7e7e763dace587c6685d9a6',  //String: "APP_ID|APP_SECRET"
			        overwrite_fields: true,
			        fields: {
			        	events: 
			        	{
			        		limit: 5, 		//Integer: max number of posts to load
			        		parameters: ['cover','category','attending_count','id','interested_count','name','description','end_time','maybe_count','noreply_count','start_time'], // field of facebook by Graph.api
			        		dataCustom: function(data){
			        			// console.log(data)
			        			data.data = data.data.filter(function(res){
			        				var now = moment().format('YYYY-MM-DD');
			        				var date = moment(res.start_time).format('2017-MM-DD')
			        				if(moment(date).isAfter(now) )
			        				{
				        				return res;
			        				}
			        			})
			        			data.data = data.data.sort(sortBasedOnEventStart)
			        			
			        			return data;
			        		},
					        // add new data to returned data
					        data: function(data){
					        	var data_return = {
					        		cover		: data.cover? data.cover.source : '',
					        		description	: data.description,
					        		start_time	: data.start_time,
					        		date_start	: moment(data.start_time).format('D MMM 2017'),
					        		end_time	: data.end_time,
					        		title		: data.name,
					        		event_url	: 'https://www.facebook.com/events/'+data.id+'/',
					        		created_time:data.start_time,
					        	}
					        	return data_return
					        }
			        	},
			        },
			    },
			    onRenderTemplate: function(ui, data)
			    {
			    },
	            // GENERAL SETTINGS
	            template : 'facebook_event_template.html',					//  Source of your template
	            length: 60,                                      //Integer: For posts with text longer than this length, show an ellipsis.
	            callback: function(data)
	            {
	            	// see your console log.
	            	convertToSlick();
	            	var data = $('.event-box:first-child').data();
	            	var event = moment(data.start_time).add(1, 'years')
	            	countDownNextEvent(moment(event).format('YYYY-MM-DD HH:mm:ss'), moment().format('YYYY-MM-DD HH:mm:ss'))
	            },
	        });

    		$(document).delegate('.event-box', 'mouseenter', function(event){
			    $(this).find('.event-date').addClass('rotate-20')
			})
			$(document).delegate('.event-box', 'mouseleave', function(event){
				$(this).find('.event-date').removeClass('rotate-20')
			})
		})