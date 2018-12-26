import moment from 'moment'
import xss from 'xss'

Videos = new Mongo.Collection(null)

Videos.refreshWaka = function() {
  Waka.db.Articles.find({}).fetch(function(r) {
    // articles we share
    for (var i = 0; i < r.length; i++) {
      r[i].source = 'wakaArticles'
      r[i]._id += 'w'
      try {
        Videos.upsert({_id: r[i]._id}, r[i])
      } catch(err) {
        console.log(err)
      }
    }
  })
  // Waka.mem.Peers.find({},{}).fetch(function(res){
  //   // articles in our network
  //   var videos = []
  //   for (var i = 0; i < res.length; i++) {
  //     if (!res[i].index) continue
  //     for (var y = 0; y < res[i].index.length; y++) {
  //       var exists = false
  //       for (var v = 0; v < videos.length; v++) {
  //         if (videos[i].title == res[i].index[y].title) {
  //           videos[i].sharedBy++
  //           exists = true
  //         }
  //       }
  //       if (!exists) {
  //         res[i].index[y].sharedBy = 1
  //         videos.push(res[i].index[y])
  //       }
  //     }
  //   }

  //   for (var i = 0; i < videos.length; i++) {
  //     videos[i].source = 'wakaPeers'
  //     videos[i]._id += 'p'
  //     try {
  //       Videos.upsert({_id: videos[i]._id}, videos[i])
  //     } catch(err) {
  //       console.log(err)
  //     }
  //   }
  // })
}

Videos.refreshBlockchain = function(cb) {
  var nbCompleted = 0;
  if (!Session.get('lastHot'))
    Videos.getVideosBy('hot', null, function() {
      returnFn()
    })
  if (!Session.get('lastTrending'))
    Videos.getVideosBy('trending', null, function() {
      returnFn()
    })
  if (!Session.get('lastCreated'))
    Videos.getVideosBy('created', null, function() {
      returnFn()
    })
  var returnFn = function() {
    if (Session.get('lastHot') && Session.get('lastTrending') && Session.get('lastCreated'))
      cb()
  }
}

Videos.getVideosRelatedTo = function(id, author, link, days, cb) {
  var dateFrom = moment().subtract(days,'d').format('YYYY-MM-DD');
  var dateQuery = 'created:>='+dateFrom
  Search.moreLikeThis(id, function(err, response) {
    var videos = response.results
    for (let i = 0; i < videos.length; i++) {
      videos[i].source = 'askSteem'
      videos[i]._id += 'a'
      videos[i].relatedTo = author+'/'+link
      try {
        Videos.upsert({ _id: videos[i]._id }, videos[i])
      } catch (err) {
        cb(err)
      }
    }
    cb(null)
  })
  // AskSteem.related({author: author, permlink: permlink, include: 'meta,payout', q:dateQuery+" AND meta.video.info.title:*"}, function(err, response) {
  //   var videos = []
  //   for (let i = 0; i < response.results.length; i++) {
  //     var video = Videos.parseFromAskSteemResult(response.results[i])
  //     if (video) videos.push(video)
  //   }
  //   for (let i = 0; i < videos.length; i++) {
  //     videos[i].source = 'askSteem'
  //     videos[i]._id += 'a'
  //     videos[i].relatedTo = author+'/'+permlink
  //     try {
  //       Videos.upsert({ _id: videos[i]._id }, videos[i])
  //     } catch (err) {
  //       cb(err)
  //     }
  //   }
  //   cb(null)
  // })
}

Videos.getVideosByTags = function(page, tags, days, sort_by, order, maxDuration, cb) {
  var queries = []
  if (days) {
    dateFrom = new Date().getTime() - (days*24*60*60*1000)
    queries.push('ts:>='+dateFrom)
  }
  if (maxDuration && maxDuration < 99999)
    queries.push('json.duration:<='+maxDuration)
  for (let i = 0; i < tags.length; i++)
    queries.push('votes.tag:'+tags[i])

  var query = queries.join(' AND ')

  Search.text(query, function(err, response) {
    console.log(response)
    var videos = response.results
    for (let i = 0; i < videos.length; i++) {
      videos[i].source = 'askSteem'
      videos[i]._id += 'a'
      videos[i].askSteemQuery = {
        tags: tags.join('+'),
        byDays: days,
        sort_by: sort_by,
        order: order
      }
      try {
        Videos.upsert({ _id: videos[i]._id }, videos[i])
      } catch (err) {
        cb(err)
      }
    }
    cb(null)
  })
}

Videos.setLastBlog = function(channel, item) {
  var lastBlogs = Session.get('lastBlogs')
  lastBlogs[channel] = item
  Session.set('lastBlogs', lastBlogs)
} 

Videos.getVideosByBlog = function(author, limit, cb) {
  var query = {
    tag: author,
    limit: Session.get('remoteSettings').loadLimit,
    truncate_body: 1
  };

  if (limit) query.limit = limit

  var start_author = null
  var start_permlink = null

  if (Session.get('lastBlogs')[author]) {
    start_author = Session.get('lastBlogs')[author].author
    start_permlink = Session.get('lastBlogs')[author].link
  }

  avalon.getDiscussionsByAuthor(author, start_author, start_permlink, function (err, result) {
    if (err === null || err === '') {
      Videos.setLastBlog(author, result[result.length-1])
      var i, len = result.length;
      var videos = []
      for (i = 0; i < len; i++) {
        var video = Videos.parseFromChain(result[i])
        if (video) videos.push(video)
      }
      for (var i = 0; i < videos.length; i++) {
        videos[i].source = 'chainByBlog'
        videos[i]._id += 'b'
        videos[i].fromBlog = FlowRouter.getParam("author")
        try {
          Videos.upsert({ _id: videos[i]._id }, videos[i])
        } catch (err) {
          cb(err)
        }
      }
      cb(null)
    } else {
      cb(err);
    }
  });
}

Videos.getVideosBy = function(type, limit, cb) {
  var query = {
    "tag": "dtube",
    "limit": Session.get('remoteSettings').loadLimit,
    "truncate_body": 1
  }

  if (limit) query.limit = limit

  switch(type) {
    case 'trending':
        // if (Session.get('lastTrending')) {
        //   query.start_author = Session.get('lastTrending').author
        //   query.start_permlink = Session.get('lastTrending').permlink
        // }
        // steem.api.getDiscussionsByTrending(query, function(err, result) {
        //   if (err === null || err === '') {
        //       Session.set('lastTrending', result[result.length-1])
        //       var i, len = result.length;
        //       var videos = []
        //       for (i = 0; i < len; i++) {
        //           var video = Videos.parseFromChain(result[i])
        //           if (video) videos.push(video)
        //       }
        //       for (var i = 0; i < videos.length; i++) {
        //         videos[i].source = 'chainByTrending'
        //         videos[i]._id += 't'
        //         try {
        //           Videos.upsert({_id: videos[i]._id}, videos[i])
        //         } catch(err) {
        //           console.log(err)
        //           cb(err)
        //         }
        //       }
        //       cb(null)
        //   } else {
        //       console.log(err);
        //       cb(err)
        //   }
        // });
        break;
    case 'hot':
        var lastAuthor = Session.get('lastHot') ? Session.get('lastHot').author : null
        var lastLink = Session.get('lastHot') ? Session.get('lastHot').link : null
        avalon.getHotDiscussions(lastAuthor, lastLink, function(err, result) {
          if (err === null || err === '') {
              Session.set('lastHot', result[result.length-1])
              var i, len = result.length;
              var videos = []
              for (i = 0; i < len; i++) {
                  var video = Videos.parseFromChain(result[i])
                  if (video) videos.push(video)
              }
              for (var i = 0; i < videos.length; i++) {
                videos[i].source = 'chainByHot'
                videos[i]._id += 'h'
                try {
                  Videos.upsert({_id: videos[i]._id}, videos[i])
                } catch(err) {
                  console.log(err)
                  cb(err)
                }
              }
              cb(null)
          } else {
              console.log(err);
              cb(err)
          }
        });
        break;
    case 'created':
        var lastAuthor = Session.get('lastCreated') ? Session.get('lastCreated').author : null
        var lastLink = Session.get('lastCreated') ? Session.get('lastCreated').link : null
        avalon.getNewDiscussions(lastAuthor, lastLink, function(err, result) {
          Session.set('lastCreated', result[result.length-1])
          if (err === null || err === '') {
              var i, len = result.length;
              var videos = []
              for (i = 0; i < len; i++) {
                  var video = Videos.parseFromChain(result[i])
                  if (video) videos.push(video) 
              }
              for (var i = 0; i < videos.length; i++) {
                videos[i].source = 'chainByCreated'
                videos[i]._id += 'c'
                try {
                  Videos.upsert({_id: videos[i]._id}, videos[i])
                } catch(err) {
                  console.log(err)
                  cb(err)
                }
              }
              cb(null)
          } else {
              console.log(err);
              cb(err)
          }
        });
        break;
    case 'createdLive':
        // steem.api.getDiscussionsByCreated(query, function(err, result) {
        //   if (err === null || err === '') {
        //       var i, len = result.length;
        //       var videos = []
        //       for (i = 0; i < len; i++) {
        //           var video = Videos.parseFromChain(result[i])
        //           if (video) videos.push(video) 
        //       }
        //       for (var i = 0; i < videos.length; i++) {
        //         videos[i].source = 'chainByCreated'
        //         videos[i]._id += 'c'
        //         try {
        //           Videos.upsert({_id: videos[i]._id}, videos[i])
        //         } catch(err) {
        //           console.log(err)
        //           cb(err)
        //         }
        //       }
        //       cb(null)
        //   } else {
        //       console.log(err);
        //       cb(err)
        //   }
        // });
        // break;
    default:
        console.log('Error getVideosBy type unknown')
  }
}

Videos.loadFeed = function(username) {
  console.log('Loading notifications for '+username)
  Notifications.getCentralized()

  console.log('Loading feed for '+username)
  avalon.getFeedDiscussions(username, null, null, function(err, result) {
    if (err === null || err === '') {
        var i, len = result.length;
        var videos = []
        for (i = 0; i < len; i++) {
            //console.log(result[i].author, result[i].reblogged_by)
            var video = Videos.parseFromChain(result[i])
            if (!video) continue;
            videos.push(video)
        }
        for (var i = 0; i < videos.length; i++) {
          videos[i].source = 'chainByFeed-'+username
          videos[i]._id += 'f'
          try {
            Videos.upsert({_id: videos[i]._id}, videos[i])
          } catch(err) {
            console.log(err)
          }
        }
    } else {
        console.log(err);
    }
  });
}

Videos.parseFromChain = function(video, isComment) {
  if (!video || !video.json || !video.json.app || video.json.app != 'deadtube') return
  video.replies = avalon.generateCommentTree(video, video.author, video.link)
  video.ups = 0
  video.downs = 0
  video.tags = []
  if (video.votes) {
    for (let i = 0; i < video.votes.length; i++) {
        if (video.votes[i].vt > 0)
            video.ups += video.votes[i].vt
        if (video.votes[i].vt < 0)
            video.downs -= video.votes[i].vt
        if (video.votes[i].tag.length > 0) {
          var isAdded = false
          for (let y = 0; y < video.tags.length; y++) {
            if (video.tags[y].t == video.votes[i].tag) {
              video.tags[y].total += video.votes[i].vt
              isAdded = true
              break
            }
          }
          if (!isAdded)
            video.tags.push({t: video.votes[i].tag, total: video.votes[i].vt})
        }
    }
  }
  video.tags = video.tags.sort(function(a,b) {
    return b.total - a.total
  }).slice(0, 4)
  video.totals = video.ups - video.downs
  if (!video.dist) video.dist = 0
  return video;
}

Videos.parseFromAskSteemResult = function(result) {
  try {
    var newVideo = result.meta.video
  } catch(e) {
    console.log(e)
  }
  if (!newVideo) return
  newVideo.active_votes = result.net_votes
  newVideo.author = result.author
  newVideo.permlink = result.permlink
  newVideo.created = result.created
  newVideo.pending_payout_value = result.payout+' SBD'
  newVideo.total_payout_value = '0.000 SBD'
  newVideo.curator_payout_value = '0.000 SBD'
  if (!newVideo._id) newVideo._id = newVideo.author+'_'+newVideo.permlink
  return newVideo;
}

Videos.commentsTree = function(content, rootAuthor, rootPermlink) {
  var rootVideo = content[rootAuthor+'/'+rootPermlink]
  var comments = []
  for (var i = 0; i < rootVideo.replies.length; i++) {
    var comment = Videos.parseFromChain(content[rootVideo.replies[i]], true)
    comment.comments = Videos.commentsTree(content, content[rootVideo.replies[i]].author, content[rootVideo.replies[i]].permlink)
    comments.push(comment)
  }
  comments = comments.sort(function(a,b) {
    var diff = parseInt(b.total_payout_value.split(' ')[0].replace('.',''))
      +parseInt(b.curator_payout_value.split(' ')[0].replace('.',''))
      +parseInt(b.pending_payout_value.split(' ')[0].replace('.',''))
      -parseInt(a.total_payout_value.split(' ')[0].replace('.',''))
      -parseInt(a.curator_payout_value.split(' ')[0].replace('.',''))
      -parseInt(a.pending_payout_value.split(' ')[0].replace('.',''))
    if (diff == 0) {
      return new Date(b.created) - new Date(a.created)
    } return diff
  })
  return comments
}

Videos.getContent = function (author, permlink, loadComments, loadUsers) {
  steem.api.getContent(author, permlink, function (err, result) {
    var video = Videos.parseFromChain(result)
    if (!video) return;
    video.source = 'chainDirect'
    video._id += 'd'
    Videos.upsert({ _id: video._id }, video)
    if (!loadComments) return
    Template.video.loadComments(author, permlink, false)
  });
}

Videos.loadComments = function (author, permlink, loadUsers) {
  Session.set('loadingComments', true)
  steem.api.getContentReplies(author, permlink, function (err, result) {
    var oldVideo = Videos.findOne({ 'info.author': author, 'info.permlink': permlink, source: 'chainDirect' })
    oldVideo.comments = result
    Videos.upsert({ _id: oldVideo._id }, oldVideo)
    Session.set('loadingComments', false)

    if (!loadUsers) return
    var usernames = [oldVideo.info.author]
    for (var i = 0; i < oldVideo.comments.length; i++) {
      usernames.push(oldVideo.comments[i].author)
    }
    ChainUsers.fetchNames(usernames)
  })
}
