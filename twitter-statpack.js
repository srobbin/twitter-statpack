/*
  @author: Scott Robbin
  @url: http://srobbin.com
  @title: Twitter Statpack
  @description: Twitter Statpack is an enhancement for Twitter.com which helps explain how someone is related to you.
                It compares the people you follow to the followers/following of a another profile, and shows 
                you where they intersect.
  @license: MPL and GPL
*/

jetpack.tabs.onReady(function(doc){
  
  // Only run on Twitter.com
  if(!this.url.match(/[http|https]:\/\/twitter.com/)) return;
 
  var me = $("meta[name=session-user-screen_name]", doc).attr("content"),
      you = $("meta[name=page-user-screen_name]", doc).attr("content"),
      is_private = $(".protected", doc).length,
      loader = "http://s.twimg.com/a/1256597179/images/spinner.gif",
      default_profile_img = "http://s.twimg.com/a/1258070043/images/default_profile_4_mini.png";
 
  // The user has to be logged in and viewing a public profile.
  if((me && you) && (me != you) && !is_private && $(".stats", doc).length > 0) {
    var you_short,
    my_friends,
    your_friends,
    your_followers,
    friends_who_follow = [],
    following_in_common = [],
    done_interval,
    im_done = your_friends_done = your_followers_done = false;
    
    // Truncate the username for display purposes only.
    you_short = (you.length > 8) ? you.substring(0, 5) + "..." : you;
    
    // Create the DOM elements to hold the new stats.
    newDOM = createNewStatsDOM({
      paddingTop: "7px",
      stats: {
          following_in_common: "following in common",
          friends_who_follow: "friends follow " + you_short
        }
    });
    $(newDOM).insertAfter($(".stats tr", doc));
    
    // Set an interval that looks for both friends/follower call completions
    done_interval = setInterval(function() {
      if(im_done && your_friends_done && your_followers_done) {
        clearInterval(done_interval);
        $.each(my_friends, function(key, person) {
          if($.inArray(person, your_friends) > -1) following_in_common.push(person);
          if($.inArray(person, your_followers) > -1) friends_who_follow.push(person);
        });
        
        $("#following_in_common", doc).click(function() {showStatsImages(this, following_in_common)})
                                        .find(".stats_count").text(following_in_common.length);
        $("#friends_who_follow", doc).click(function() {showStatsImages(this, friends_who_follow)})
                                        .find(".stats_count").text(friends_who_follow.length);
      }
    }, 500);
    
    // Make all three requests at once. Using the setTimeout to wait for their return
    // TODO: setTimeout should fail after a while, or these should use an onError function
    $.getJSON("http://twitter.com/friends/ids.json", {screen_name: me}, function(data) {
      my_friends = $.makeArray(data), im_done = true;
    });
    $.getJSON("http://twitter.com/friends/ids.json", {screen_name: you}, function(data) {
      your_friends = $.makeArray(data), your_friends_done = true;
    });
    $.getJSON("http://twitter.com/followers/ids.json", {screen_name: you}, function(data) {
      your_followers = $.makeArray(data), your_followers_done = true;
    });
  }
  
  // Creates DOM elements that will hold the stats
  function createNewStatsDOM(opts) {
    var tr = $("<tr></tr>", doc).attr("id", "new_stats"),
        td, a, span_stats, span_label;
    
    $.each(opts.stats, function(k, v) {
      span_stats = $("<span></span>", doc).addClass("stats_count numeric")
                                          .html("<img src=\""+ loader + "\" />");
      span_label = $("<span></span>", doc).addClass("label").text(v);
    
      td = $("<td></td>", doc).css("paddingTop", opts.paddingTop)
                              .appendTo(tr);
    
      a = $("<a></a>", doc).attr({id: k, title: "Click to see profile images", href: "#"})
                           .click(function(){return false;})
                           .append(span_stats)
                           .append(span_label)
                           .appendTo(td);
    
    });
    
    // Need to account for the new lists column
    if($(".stats tr td", doc).length == 3)
      $("<td>&nbsp;</td>", doc).appendTo(tr);
        
    return tr;
  }
  
  // Displays the profile images in a familiar grid.
  function showStatsImages(el, users) {
    var profile_el = $("#profile_" + el.id, doc),
        div, h2, title, a, img, stats_loader_img;
            
    if(profile_el.length == 0) {
      profile_el = $("<div></div>", doc).attr("id", "profile_" + el.id)
                            .addClass("new_stats_profile_box")
                            .css("display", "none")
                            .insertBefore($("#primary_nav", doc));
                          
      stats_loader_img = $("<img>", doc).attr({src: loader, id: "stats-loader-img"})
                                   .css({float: "right", margin: "2px 10px 0 0"})
                                   .appendTo(profile_el);
                                   
      h2_title = (el.id).replace(/_/g," ");
    
      h2 = $("<h2></h2>", doc).text(h2_title)
                              .addClass("sidebar-title")
                              .css("textTransform", "capitalize")
                              .appendTo(profile_el);
      
      div = $("<div></div>", doc).css({"padding": "5px 10px 5px 14px", marginBottom: "5px"})
                                 .appendTo(profile_el);
      
      profile_el.append($("<hr />", doc).css("clear", "both"));
      
      // At this point, we only know the user's ID. What we really need is the username and profile_image.
      // So, we'll load a dummy image, then ask a web service to get us the necessary info.
      // Note: This is custom Google App Engine site built to help this Jetpack.
      $.each(users.slice(0,36), function() {
        var user_id = this;
        img = $("<img />", doc).attr("src", "data:image/gif;base64,R0lGODlhAQABAIAAAO7u7gAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw")
                             .css({"height": "24px", "width": "24px"})
                             .bind("load", function() {
                                var self = this;
                                $(self).unbind("load");
                                
                                $.getJSON("http://twitter-statpack.appspot.com/" + user_id, function(data) {
                                  try {
                                    $(self).attr("src", data.profile_mini_image_url)
                                           .bind("load", function() {
                                              $(this).unbind("load");
                                              if($("#stats-loader-img", doc).length > 0)
                                                $("#stats-loader-img", doc).remove();
                                            })
                                           .parent().attr({href: "http://twitter.com/" + data.screen_name, title: data.name});
                                  } catch(err) {
                                    // Something went wrong. Just show a default Twitter profile image.
                                    $(self).attr("src", default_profile_img);
                                  }
                                });
                             });
      
        a = $("<a></a>", doc).attr("href", "http://twitter.com/account/redirect_by_id?id=" + user_id)
                             .append(img);
                    
        $("<span></span>", doc).css({"float": "left", "padding": "0 3px 2px 1px"})
                          .append(a)
                          .appendTo(div);
      });
      
      // If there are more than 36 users, create a view all link  
      if(users.length > 36) {
        $("#friends_view_all", doc).clone()
                                   .removeAttr("id")
                                   .css({fontSize: "0.9em", clear: "both"})
                                   .appendTo(div);
      }
      
    }
    
    $(".new_stats_profile_box", doc).css({display: "none"});
    profile_el.css({display: "block"});
  }
  
});