const express = require("express");
const router = express.Router();
const request = require('request');
const cheerio = require('cheerio');
const tabletojson = require('tabletojson');
const he = require('he');
const googleTranslate = require('google-translate')(process.env.GOOGLE_API_KEY);
const querystring = require('querystring');

module.exports = router;

router.get("/", (req, res) => {

    console.log("********** started ***************");

    const url = 'http://localhost:4000/test.html';

    request(url, function (error, response, html) {

        let localeKey = [], localeValue = [];
        /* Product detail parsing*/
        let $ = cheerio.load(html);
        let productDetail = $(".tbl_type07").html();
        productDetail = productDetail.substring(productDetail.indexOf('<tbody>'), productDetail.indexOf('</tbody>') + 1);
        productDetail = `<table>${productDetail}</table>`;

        const resultObj = {};
        let converted = tabletojson.convert(productDetail, {forceIndexAsNumber: true, useFirstRowForHeadings: true});
        converted = converted[0];

        let results = {};
        for (let index = 0; index < converted.length; index++) {

            results[converted[index]["0"]] = converted[index]["1"];

            localeKey.push(converted[index]["0"]);
            localeValue.push(converted[index]["1"]);
        }

        /****************************/

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

        resultObj.Price = value;

        localeKey.push("Price");
        localeValue.push(value);

        parent = $('.sp.salecoupon.couponDown').text().replace(/\t/g, ' ').replace(/\n/g, ' ').trim();

        resultObj.Discount_percent = parent;

        localeKey.push("Discount_percent");
        localeValue.push(parent);


        resultObj.Manufacture = results["제조자"];

        localeKey.push("Manufacture");
        localeValue.push(results["제조자"]);
        /* Shipping Fee parsing*/

        parent = $('.deli').html().toString();

        start = parent.indexOf('<dd>');
        end = parent.indexOf('</dd>');

        value = he.decode(parent.substring(start + 4, end).replace(/<[^>]+>/g, ' ').replace(/\t/g, ' ').replace(/\n/g, ' ').trim());

        resultObj.Shipping_fee = value;
        localeKey.push("Shipping_fee");
        localeValue.push(value);

        resultObj.product_details = results;

        /**************************/

        /* Parsing of image url's**/

        parent = $('#mainGoodsImage').attr('src');
        parent = "http:" + parent;
        parsedJsonObj.image_urls = parent;


        /*************************/

        /* Localisation of Korean to English */
        Promise.all([translate(localeKey), translate(localeValue)]).then((data) => {
            for (let index = 0; index < data[0].length; index++) {
                const parsedKey = data[0][index].translatedText.split(' ').join('_');
                parsedJsonObj[parsedKey] = data[1][index].translatedText;
            }
            /* parsing final o/p */
            const details = {}, Product_details = {};
            for (let key in parsedJsonObj) {
                if (key !== "Price" && key !== "Discount_percent" && key !== "Manufacture" && key !== "Shipping_fee" && key !== "image_urls") {
                    Product_details[key] = parsedJsonObj[key];
                }
                else {
                    details[key] = parsedJsonObj[key];
                }
            }
            details.Product_details = Product_details;
            /**************************/
            res.send(details)
        })

        /**************************/

    });

});

router.get("/product", (req, res) => {
    let anyData;
    const url = 'http://www.akmall.com/bestseller/BestShopAkmall.do';

    let arr = [];
    request(url, function (error, response, html) {
        global.cook = response.headers['set-cookie'];
        let $ = cheerio.load(html);
        const finalResponse = [];
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
        const requestArray = arr.map((obj) => {
            return new Promise((resolve, reject) => {
                convertToJSON(obj, (data) => {
                    if (data) {
                        resolve(data);
                    }
                    else
                        reject(data);
                })
            })
        });
        let resp = "";
        Promise.all(requestArray).then((result) => {
            // for (let index = 0; index < result.length; index++) {
            //     resp += result[index];
            // }
            res.send(result)
        });

    });


});

function translate(localeDataArray) {
    return new Promise((resolve, reject) => {
        googleTranslate.translate(localeDataArray, 'ko', 'en', function (err, translations) {
            if (err)
                reject(err);
            resolve(translations)
        });
    });
}


function convertToJSON(obj, cb) {
    console.log(obj);
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
    console.log(postData);
    request({
        method: 'POST',
        url: obj.url,
        headers: {
            'Content-Length': postData.length,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        form: postData
    }, function (error, response, html) {
        let $ = cheerio.load(html);

        let str = [];
        const finalResponse = [];

        $('#tab').find('ul.prod_list > li').each((index, element) => {
            const resultObj = {};

            let elementHtml = cheerio.load(element);
            const imageUrl = elementHtml('div.thumb').find('img').first().attr('src');

            resultObj.imageUrl = 'http:' + imageUrl;
            console.log(resultObj.imageUrl);
            /* *************** Scrapping of the element description and discount*****************/
            elementHtml('dl.cont').find('dt a').each((index1, element1) => {

                const el = cheerio.load(element1);
                resultObj.prom = el('.prom').html() ? he.decode(el('.prom').html().toString().replace(/<[^>]+>/g, ' ').replace(/\t/g, ' ').replace(/\n/g, ' ')) : '';
                el('.prom').length = 0;
                resultObj.prom2 = el('.prom2').html() ? he.decode(el('.prom2').html().toString().replace(/<[^>]+>/g, ' ').replace(/\t/g, ' ').replace(/\n/g, ' ')) : '';
                el('.prom2').length = 0;

                resultObj.description = el('span').html() ? he.decode(el('span').html().toString()) : '';
            });
            /*********************************/

            /* *************** Scrapping of the element price*****************/
            elementHtml('dl.cont').find('dd.price').each((index1, element1) => {

                const el = cheerio.load(element1);

                resultObj.price = el('span.price0').html() ? he.decode(el('span.price0').html().toString().replace(/<[^>]+>/g, ' ').replace(/\t/g, ' ').replace(/\n/g, ' ')) : '';
                resultObj.price = resultObj.price.substring(resultObj.price.indexOf(':') + 1).trim();

                resultObj.discount = el('span.price2').html() ? he.decode(el('span.price2').html().toString().replace(/<[^>]+>/g, ' ').replace(/\t/g, ' ').replace(/\n/g, ' ')) : '';
                resultObj.discount = resultObj.discount.substring(resultObj.discount.indexOf(':') + 1).trim();


            });
            /*********************************/


            /* *************** Scrapping of the element price*****************/
            elementHtml('dl.cont').find('dd.option').children('span').each((index1, element1) => {

                const el = cheerio.load(element1);

                if (el.html()) {

                    let data;
                    data = he.decode(el.html().toString().replace(/<[^>]+>/g, ' ').replace(/\t/g, ' ').replace(/\n/g, ' '));

                    data = data.split(' ');
                    data = data.filter(elem => elem.length > 0);

                    if (el.html().toString().indexOf('ico_coupon') > -1) {
                        resultObj.coupon = data.length === 2 ? data[1] : '';
                    }
                    else if (el.html().toString().indexOf('ico_discount') > -1) {
                        resultObj.instantDiscount = data.length === 2 ? data[1] : '';
                    }
                    else if (el.html().toString().indexOf('ico_card') > -1) {
                        resultObj.NHcard = data.length === 2 ? data[1] : '';
                    }
                    else if (el.html().toString().indexOf('ico_inter_free') > -1) {
                        resultObj.interest = data.length === 2 ? data[1] : '';
                    }
                    else if (el.html().toString().indexOf('ico_review') > -1) {
                        resultObj.review = data.length === 2 ? data[1] : '';
                    }
                    else if (el.html().toString().indexOf('ico_free_ship') > -1) {
                        resultObj.shipment = data.length === 2 ? data[1] : '';
                    }
                }
            });
            /*********************************/

            /* Pushing final object to the array to display response **/
            finalResponse.push(resultObj);
        });
        cb(finalResponse);
    });
}