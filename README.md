# sfdc-verify

[View it live on Heroku](https://sfdc-verify.herokuapp.com).

Salesforce's [Trust website](https://trust.salesforce.com/en/) can be used to track performance of real-time actions on the Saleforce.com platform. However, many developers and customers rely on Asynchronous processes to work within the Salesforce platform. This tool can be used to view and monitor the performance of some Salesforce Asynchronous processes over time.

# Support for more Data Centers

I need your help! Do you have a development organization that you are no longer using on a data center not covered here? If so, I'd love to start tracking it! Email me the username, password and security token and I'll add it to the database and start monitoring it's performance.

# Deploy

Deploying through the Metadata API is often used by developers using external tools to develop on Salesforce. The Metadata API's Deploy action sends code from a local development tool into a Salesforce organization. The deployment process takes in a ZIP and validates it against itself and the metadata in the organization. The processing of a deploy is usually correlated to the size of the deploy. However, the processing does not start immedietly. Typically, a request will go into a queue and will be processed soon after. These queue sizes increase based on the amount of deployments and how long they take to execute on the data center.

This tool displays the amount of time a small 2-class deployment will stay in the queue before being saved into Salesforce. The deployment can be found within this project.

# Async Apex Test

Async Apex Testing uses the Tooling API. This Tooling API allows you to specify the specific test classes that should be run. The time these requests spends in the queue appears to be unobtainable (or bugged). A fair number of ApexTestRunResult objects returned have a start time before the created date (usually by a second) indicating that there is nearly no queue time. (I suspect that startTime is populated before the Transaction is complete and the record is saved to the database, where createdDate is populated). The Execution time of these jobs should be fairly consistent over time. A spike in Async Apex Execution Time could indicate that servers are generally busy or poor performing.

Async Apex Test results displayed through this tool represent the execution time of a test with a single test method, 4 lines and 2 asserts. The exact package can be found within this project.

# Setup

To set up and run this (locally or externally) you should do the following:

1) npm install all dependencies

2) Get a mongodb installation accessible through a mongodb:// uri (mLab on Heroku works well)

3) Acquire a Salesforce Dev org through normal means

4) Add login data to mongodb in a collection called "logins" in the following format: { \<datacenter> : { username : \<username>, password: \<password>\<securityToken> }}. It should be a single document. This may change later, but for now I stuck with the same format from an old DB provider for simplicity

5) Set up a scheduled process (I'm using Heroku Scheduler Addon) to run \bin\deploy and \bin\tooling on an interval (I'm using 10 minutes). (Ensure deploy is run before tooling or you may have a problem running tests that don't exist).

6) npm start from project directory should get the site up and running.

# REST API Access

The API is fairly well defined, completely open and probably won't change too much. Here's some reference if you'd like to code against it. (If you do code against it, let me know and I'll be sure to let you know before I change it, or avoid changing it)

Current hostname: https://sfdc-verify.heroku.com

Method:  /summary

Params: dataCenters (Comma Separated List of data centers). Not specifying this will include all datacenters.

Return value: Summary of performance for requested datacenters. Formatted like this:

```javascript
{  
   "eu11":{  
      "Deploy Queue Time":[  
         {  
            "name":"Recent",
            "value":0,
            "status":"good",
            "units":"Seconds"
         },
      ],
      "Async Test Execution Time":[  
         {  
            "name":"Recent",
            "value":1,
            "status":"good",
            "units":"Second"
         },
         .
         .
         .
      ]
   }
   .
   .
   .
}
```

Method:  /raw

Params: dataCenters (Comma Separated List of data centers). Not specifying this will include all datacenters.

timePeriod (Number of Hours you wish to see previous to the specified endDateTime). Default is 24 (1 day).

endDateTime (Timestamp of when the query should stop). Default is the value of (new Date().getTime()).

predictions (boolean). Default is true. If false, it will not show any predictions data going into the future

Return value: Raw data for the past day for datacenters specified

```javascript
{  
   "eu11":{  
      "Deploy Queue":{  
         "0Af0Y00000M3uYJSAZ":{  
            "completedDate":1484350619000,
            "createdDate":1484350619000,
            "deployId":"0Af0Y00000M3uYJSAZ",
            "executionSeconds":0,
            "queuedSeconds":0,
            "startDate":1484350619000
         },
         "0Af0Y00000M3uYTSAZ":{  
            "completedDate":1484351178000,
            "createdDate":1484351178000,
            "deployId":"0Af0Y00000M3uYTSAZ",
            "executionSeconds":0,
            "queuedSeconds":0,
            "startDate":1484351178000
         },
         .
         .
         .
      },
      "Apex Test Execution":{  
         "7070Y000007GPyWQAW":{  
            "completedDate":1484350760000,
            "createdDate":1484350760000,
            "deployId":"7070Y000007GPyWQAW",
            "executionSeconds":0,
            "queuedSeconds":0,
            "startDate":1484350760000
         },
         "7070Y000007GPzdQAG":{  
            "completedDate":1484351327000,
            "createdDate":1484351327000,
            "deployId":"7070Y000007GPzdQAG",
            "executionSeconds":0,
            "queuedSeconds":0,
            "startDate":1484351327000
         },
         .
         .
         .
      }
   },
   .
   .
   .
}

```
