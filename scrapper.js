const express = require("express");
const router = express.Router();
const request = require('request');
const cheerio = require('cheerio');
const tabletojson = require('tabletojson');
const he = require('he');
const googleTranslate = require('google-translate')('AIzaSyB9U9dxk1xveVSQC2FjMxxlobJZrUsON_o');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');
module.exports = router;

let file;
try {
    console.log("Old File Deleted!!")
} catch (e) {
    console.log("No file exists!");
}
finally {
    file = fs.createWriteStream('./public/result.json', {flags: 'w'});

}
router.getTopProducts = (req, res) => {

    const url = 'http://www.akmall.com/bestseller/BestShopAkmall.do';
    let arr = [];
    request(url, async function (error, response, html) {
        global.cook = response.headers['set-cookie'];
        let $ = cheerio.load(html);

        let elemLength = 0;
        $('ul.tree').find('li').each((index, element) => {
            let el = cheerio.load(element);
            el('ul').find('li').each((index1, element1) => {
                elemLength++;
            });
        });
        $ = cheerio.load(html);
        $('ul.tree').find('li').each((index, element) => {
            let el = cheerio.load(element);
            el('ul').find('li').each((index1, element1) => {
                let elem = cheerio.load(element1);
                let url = elem('a').attr('onclick');
                url = url.substring(url.indexOf('(') + 3, url.lastIndexOf(')')).replace(/'/g, '');
                url = url.split(',');

                arr.push({
                    url: 'http://www.akmall.com/' + url[0] + '?ctgId=' + url[4].trim(),
                    groupId: url[2].trim(),
                    ctgId: url[4].trim()
                });
            });
        });
        let urlList = [];
        const requestArray = arr.map((obj) => {
            return new Promise((resolve, reject) => {
                convertToJSON(obj, (data) => {
                    if (data) {
                        resolve(data);
                    } else
                        reject(data);
                })
            })
        });
        Promise.all(requestArray).then(async (data) => {
            for (let index = 0; index < data.length; index++) {
                urlList = urlList.concat(data[index]);
            }
            console.log("done");
            file.write("[");
            for (let counter = 0; counter < urlList.length; counter++) {
                const data = await translateProduct(urlList[counter]);
                file.write(JSON.stringify(data));
                if (counter < urlList.length - 1)
                    file.write(",");
            }
            file.write("]");
        });

    });
};

function translate(localeDataArray) {
    return new Promise((resolve, reject) => {
        // googleTranslate.translate(localeDataArray, 'ko', 'en', function (err, translations) {
        //     if (err)
        //         reject(err);
        //     resolve(translations)
        // });
        resolve(localeDataArray);
    });
}


function convertToJSON(obj, cb) {

    const productListArray = [];
    // console.log(obj);
    const postData = {
        price_min: 100,
        price_max: 1000000,
        sex: "all",
        age: "all",
        groupId: obj.groupId,
        rank_in_group: 1,
        ctgId: obj.ctgId,
        disp_div: "ctg",
        sort_div: "popular",
        mall_div: "AKMall",
        pageIdx: 1,
        ranking: 1,
        sexCode: "all",
    };

    request({
        method: 'POST',
        url: obj.url,
        headers: {
            'Content-Length': postData.length,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        form: postData
    }, async function (error, response, html) {
        let $ = cheerio.load(html);

        let str = [];
        const finalResponse = [];

        $('#tab').find('ul.prod_list > li').each((index, element) => {
            const resultObj = {};

            let elementHtml = cheerio.load(element);
            let productUrl = elementHtml('div.thumb').find('a').first().attr('onclick');

            if (productUrl) {
                productUrl = productUrl.substring((productUrl.indexOf('(') + 1), productUrl.lastIndexOf(')')).replace(/'/g, '');
                productUrl = productUrl.split(',');
                productListArray.push('http://www.akmall.com/goods/GoodsDetail.do?goods_id=' + productUrl[0] + '&urlpath=' + productUrl[1].trim() + productUrl[2].trim());
            }
        });
        console.log(productListArray.length);
        cb(productListArray);
    });
}

function translateProduct(url) {
    return new Promise((resolve, reject) => {
        fetchItem(url).then((data) => {
            resolve(data)
        }).then((err) => {
            reject(err)
            console.log(err)
        });
    })


}

function mapPromiseToMakeSync(obj) {
    return new Promise((resolve, reject) => {
        convertToJSON(obj, (data) => {
            if (data) {
                resolve(data);
            } else
                reject("");
        })
    })
}

function fetchItem(url) {
    return new Promise((resolve, reject) => {
        const resultObj = {};
        console.log(url)
        request(url, function (error, response, html) {
            console.log("error->",error);
            let localeKey = [], localeValue = [];
            let $ = cheerio.load(html);
            let productDetail = $(".tbl_type07").html();
            if (productDetail) {
                productDetail = productDetail.substring(productDetail.indexOf('<tbody>'), productDetail.indexOf('</tbody>') + 1);
                productDetail = `<table>${productDetail}</table>`;

                let converted = tabletojson.convert(productDetail, {
                    forceIndexAsNumber: true,
                    useFirstRowForHeadings: true
                });
                converted = converted[0];

                let results = {};
                if (converted) {
                    for (let index = 0; index < converted.length; index++) {

                        results[converted[index]["0"]] = converted[index]["1"];

                        localeKey.push(converted[index]["0"]);
                        localeValue.push(converted[index]["1"]);
                    }
                }

                let parent = $('.group_1').html().toString();
                const parsedJsonObj = {};
                let start = parent.indexOf('<dl>');
                let end = parent.indexOf('</dl>');
                let str = parent.substring(start + 4, end);

                start = str.indexOf('<dt>');
                end = str.indexOf('</dt>');
                let key = he.decode(str.substring(start + 4, end).replace(/<[^>]+>/g, ' ').toString());

                start = str.indexOf('<dd>');
                end = str.indexOf('</dd>');
                let value = he.decode(str.substring(start + 4, end).replace(/<[^>]+>/g, ' ').replace(/\t/g, ' ').replace(/\n/g, ' ').trim());

                resultObj["Price"] = value;

                localeKey.push("Price");
                localeValue.push(value);

                parent = $('.sp.salecoupon.couponDown').text().replace(/\t/g, ' ').replace(/\n/g, ' ').trim();

                resultObj["Discount_percent"] = parent;

                localeKey.push("Discount_percent");
                localeValue.push(parent);


                resultObj["Manufacture"] = results["제조자"];

                localeKey.push("Manufacture");
                localeValue.push(results["제조자"]);
                /* Shipping Fee parsing*/

                parent = $('.deli').html().toString();

                start = parent.indexOf('<dd>');
                end = parent.indexOf('</dd>');

                value = he.decode(parent.substring(start + 4, end).replace(/<[^>]+>/g, ' ').replace(/\t/g, ' ').replace(/\n/g, ' ').trim());

                resultObj["Shipping_fee"] = value;
                localeKey.push("Shipping_fee");
                localeValue.push(value);

                resultObj.product_details = results;

                /**************************/

                /* Parsing of image url's**/

                parent = $('#mainGoodsImage').attr('src');
                parent = "http:" + parent;
                parsedJsonObj.image_urls = parent;
                // file.write(JSON.stringify(resultObj));
                // console.log("Written");
                // console.log(resultObj)

            }
            resolve(resultObj);
        });
    })
}
