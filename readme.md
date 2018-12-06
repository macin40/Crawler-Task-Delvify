# Crawler-Task-Delvify

****
Task -  Scrape/crawl from the site the top ranking items tab
****
Library used - Cheerio
****
Steps:

1.Crawled to fetch the content under the category tabs.
  Using this url -> `http://www.akmall.com/bestseller/BestShopAkmall.do`, fetching all the subcategory is done with this url.
  Finding class for particular group if product and searching through the element , and finally extracting the valuable data to create       JSON

2.And mapped each sub-category with the Promise,calling them parallely to fetch top 100 product list.

3.Crawled all the product info under the specific class. e.g. `http://www.akmall.com/bestseller/BestShopCtg.do?ctgId=16`
****
Route to fetch JSON - `http://localhost:4000/product`
****
To review code- 

Refer to the file `route.js` from line number `126`.
****
Steps to run the code : 

1. Take the GIT clone from https://github.com/abhishek-mani/Crawler-Task-Delvify.git

2. Navigate to the directory and run the command in the terminal `npm install`

3. Run the command `node index.js > logger.txt` in terminal

~~4. Now open the `http://localhost:4000/product` in browser, you file will be downloaded as `result.json` and also you can find that file manually under the project directory `web-scrapper->public->result.json`~~

4.The scrapping process will start , and the required file will be created in the public folder, as `result.json` , and also to check the scrapping process go to the project directory and open file `logger.txt` which gets generater on running command `node index.js > logger.txt`

###### The logger.txt will contain verbose scrapping process, for all the sub-product and there top 100 items.

****
