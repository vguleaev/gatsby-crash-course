---
path: "/forestry"
date: 2019-20-12
title: from forestry
author: Vlad

---
Hello dear coder, welcome to my tech articles series dedicated to _NSQ_. There are not so many tutorials about this technology so I decided to make one. Hope you enjoy!

##Why NSQ?
[NSQ](https://nsq.io/) is a realtime distributed messaging platform written in Go and created by wellknown service bit.ly.

It's plain and simple comparing to similar systems (like RabbitMQ), easy to use and has a good intuitive admin UI. If you have never used any Message Queue system before, NSQ is the best option to understand its principles.

##Concept of Message Queue:
Message Queue is an implementation of the [publisher/subscriber](https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern) architectural pattern which is used for communication between different parts (applications, services, etc) of your system.

![Alt text of image](https://www.cloudamqp.com/img/blog/thumb-mq.jpg "image")

In basic words, when an event happens (e.g. new user is created), a message is published to a message queue. Any services that are interested in that event is subscribed to that message.

As soon as message is published, interested service (consumer) receives a message and does some actions. (e.g. send an email to new user).

\##1. Download NSQ
Go to https://nsq.io/deployment/installing.html and download nsq binary for your OS.

Open extracted folder and there you can see different executables:

* nsqlookupd.exe
* nsqd.exe
* nsqadmin.exe
* .. _and many others but they are not so important for us_

\##2. Run nsqlookupd
Open extracted directory in shell/command terminal you prefer and run:

    ./nsqlookupd

You should see the following output:

    $ ./nsqlookupd
    [nsqlookupd] 2019/10/21 13:21:18.830625 INFO: nsqlookupd v1.2.0 (built w/go1.12.9)
    [nsqlookupd] 2019/10/21 13:21:18.832649 INFO: TCP: listening on [::]:4160
    [nsqlookupd] 2019/10/21 13:21:18.832649 INFO: HTTP: listening on [::]:4161

Which says that nsqlookupd is running and has two interfaces:
one is using TCP with port 4160 and another is using HTTP with port 4161.

To check that it works we can open browser and access http://localhost:4161/topics

    {
    	topics: [ ]
    }

This is the answer you should get and its fine. Right now we don't have any topics registered yet.

You can also get all channels, producers for specific topic, nodes of nsqd, create topics, chanels, etc. Find more in documentation \[here.\] (https://nsq.io/components/nsqlookupd.html)

Basically **nsqlookupd** is a discovery service that helps consumers to find nsqd producers for specific topic.

**nsqlookupd** is the daemon that manages topology information. Clients query nsqlookupd to discover nsqd producers for a specific topic and nsqd nodes broadcasts topic and channel information.

\##3. Run nsqd

Now run in shell nsqd:

    ./nsqd

You should see the following output:

    [nsqd] 2019/10/21 13:39:56.997863 INFO: nsqd v1.2.0 (built w/go1.12.9)
    [nsqd] 2019/10/21 13:39:56.998861 INFO: ID: 791
    [nsqd] 2019/10/21 13:39:57.000861 INFO: NSQ: persisting topic/channel metadata to nsqd.dat
    [nsqd] 2019/10/21 13:39:57.011825 INFO: HTTP: listening on [::]:4151
    [nsqd] 2019/10/21 13:39:57.011825 INFO: TCP: listening on [::]:4150

\##4. Publish a message

Now it's time to publish our first message to queue. Open [postman](https://www.getpostman.com/) or any other tool to make HTTP calls and do a request to **POST:http://localhost:4151/pub?topic=test**
with a JSON body

```json
{
  "text": "some message"
}
```

/pub is an NSQ endpoint to create messages. It requires a query param called **"topic"**. Topic represents a name of the message, any message published with the same topic will be consumed by every listener of this topic. 📨

If the request is 200 OK, our new topic will be created automatically. You will a notification about that in console of nsqd:

    [nsqd] 2019/10/21 13:49:04.740353 INFO: TOPIC(test): created
    [nsqd] 2019/10/21 13:49:04.740353 INFO: NSQ: persisting topic/channel metadata to nsqd.dat

Another line says that information about created topic was persisted to a metadata nsqd.dat file.

Open nsqd.dat file in bin directory with any text editor and you will see your topics there. But we have a much better option to view topics and maintain them. Time to use **NSQ Admin**.

\##5. Start NSQ Admin
Now run in shell nsqadmin:

    ./nsqadmin

You will see an error in console ❌

    [nsqadmin] 2019/10/21 14:18:04.255018 FATAL: failed to instantiate nsqadmin - --nsqd-http-address or --lookupd-http-address required

Error says that you need to provide an address to nsqd or nsqdlookup. Let's do it!

     ./nsqadmin --nsqd-http-address localhost:4151

Now you will see a message that nsqadmin is running:

     [nsqadmin] 2019/10/21 14:21:41.223806 INFO: nsqadmin v1.2.0 (built w/go1.12.9)
     [nsqadmin] 2019/10/21 14:21:41.224804 INFO: HTTP: listening on [::]:4171

Open in browser this address http://localhost:4171

You should be able so see one topic "test" there. Also if you go **Nodes** tab you can see that our nsqd instance is running and connected. 👍

If you press on **Lookup** tab you will see a warning. This is because now we are connected directly to nsqd avoiding using the nsqdlookup which is not recommended by creators of NSQ.

Now run this command with specific lookupd address:

    $ ./nsqadmin --lookupd-http-address localhost:4161

Open NSQ Admin UI and click Lookup tab... seems to be ok. But check **Nodes** tab again. Wait.. zero nodes? Why?

Right now we connected **nsqadmin** to **nsqlookupd** but **nsqd** instance is not connected to anything. So our chain is broken 💥!

Correct dependencies should be _nsqadmin -> nsqlookupd <- nsqd_. Let's fix it.

Just close nsqd instance and run it again specifying nsqlookupd address:

    ./nsqd -lookupd-tcp-address localhost:4160

This time we should use TCP address of lookupd, which port is 4160.

Refresh Admin UI and everything should work again. Both tabs work perfect! ✨

\##6. Create consumer application

We need to have a basic application to consume our messages. Let's create a simple Node.js app for that goal.

Create a new folder with any name and run following commands:

    npm init -y
    npm i express nsqjs

Express library is needed to create an http server and nsqjs is a official client library provided by NSQ team. [link here](https://github.com/dudleycarr/nsqjs)

Create server.js file

```javascript
const express = require('express')
const nsq = require('nsqjs')
const app = express()
const port = 3000

const reader = new nsq.Reader('test', 'test', {
  lookupdHTTPAddresses: 'localhost:4161'
})

reader.connect()

reader.on('message', msg => {
  console.log('Received message [%s]: %s', msg.id, msg.body.toString())
  msg.finish()
})

app.listen(port, () => console.log(`NSQ Consumer is listening on port ${port}!`))
```

In our project directory run:

``` 
node server.js
```

Your will receive all queued messages now. Consumer app console should show this:

    NSQ Consumer is listening on port 3000!
    Received message [0c6020dfa34cf000]: {
      "text": "some message"
    }

That happened because our message waited in queue until it was consumed.

In NSQ admin if you select Nodes you will see that new ClientHost is connected now for some seconds ago.

\##7. Test receiving messages

Keep server.js running and now make a request with POSTMAN to publish new message to topic "test"

**POST http://localhost:4151/pub?topic=test**
with a body

    {
        "text": "CONNNCTED!!! YEAH!!"
    }

You should see it in a console immediately. Congrats! 🎉 You have a working message queue system. 🖅 🖅 🖅

⚠️ NOTE: If you press Counter in NSQ Admin you will see that now its not zero anymore.

If you send messages to other topics you wont see it because we subscribed our consumer app to only one topic which is "test".

<hr/>

🚀 If you read something interesting from that article, please like and follow me for more posts. Thank you dear coder! 😏

<center><small><i>
photo by [Anastasia Dulgier](https://unsplash.com/@dulgier?utm_source=medium&utm_medium=referral) on Unsplash
</i></small></center>