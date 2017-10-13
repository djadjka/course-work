const options = require('./options.js');
let cheerio = require('cheerio');
let browser = require('webdriverio')
    .remote(options)
    .init();

module.exports = class Crawler {
    constructor(domain, comands) {
        this.domain = domain;
        this.queue = [];
        this.set = [];
        this.robotsTxt;
        this.crawlDelay = 100;
        this.disallow = [];
        this.comands = comands;
        this.result = [];
    }

    getHrefs(document) {
        let tags = document.match(/<a\b[^>]+>([^<]*(?:(?!<\/a)<[^<]*)*)<\/a>/g);
        if (!tags) {
            return [];
        }
        let hrefs = tags.map((tag) => {
            let part = tag.match(/href=("|')([^"']*)/i);
            if (part) {
                return part[0].slice(6);
            }
            return '#';
        }).filter((href) => {
            if (!href.indexOf('http') && href.indexOf(this.domain) === -1 || !href.indexOf('#') || href.indexOf('//') !== -1) {
                return false;
            }
            for (let i = 0; i < this.disallow.length; i++) {
                if (href.indexOf(this.disallow[i]) !== -1) {
                    return false;
                }
            }
            return true;
        }).map((href) => {
            if (href.indexOf(this.domain) === -1) {
                return 'https://' + this.domain + href;
            }
            return href;
        });
        return hrefs;
    };

    parseRobotsTxt(content) {
        let splitedRobot = content.split('\n');
        for (let i = 0; i < splitedRobot.length; i++) {
            if (splitedRobot[i].indexOf('Disallow') === 0) {
                let dis = splitedRobot[i].split(':')[1].trim();
                if (dis[dis.length - 1] === '/') {
                    this.disallow.push(dis.slice(0, dis.length - 1));
                } else {
                    this.disallow.push(dis);
                }
            } else if (splitedRobot[i].indexOf('Crawl-delay') === 0) {
                this.crawlDelay = parseInt(splitedRobot[i].split(':')[1].trim());
            }
        }
    }

    getBetweenText(comand, source) {
        let start = cheerio.load(source, {
            decodeEntities: false
        }).html(comand.start);
        let end = cheerio.load(source, {
            decodeEntities: false
        }).html(comand.end);
        if (start && end) {
            let result = source.slice(source.indexOf(start), source.indexOf(end.split())).replace(/<[^>]*>/gi, "");
            console.log(result);
        }
    }

    readConfig() {
        let pageResult = {};
        browser = browser.getSource('body').then((source) => {
            this.comands.forEach((comand) => {
                switch (comand.value) {
                    case 'click':
                        if (cheerio.load(source)(comand.selector)) {
                            browser = browser.click(comand.selector);
                        }
                        break;
                    case 'setText':
                        if (cheerio.load(source)(comand.selector)) {
                            browser = browser.setValue(comand.selector, comand.value);
                        }
                        break;
                    case 'read':
                        {
                            let result = cheerio.load(source)(comand.selector).text();
                            if (result) {
                                pageResult[comand.name] = result;
                            }
                        }
                        break;
                    case 'between':
                        {
                            let result = this.getBetweenText(comand, source);
                            if (result) {
                                pageResult[comand.name] = result;
                            }
                        }

                        break;
                    case 'waitElement':
                        browser = browser.waitForVisible(comand.selector, 15000);
                }
            });
            browser.then(() => {
                if (Object.keys(pageResult).length !== 0) {
                    this.result.push(pageResult);
                };
            });
        });
    }

    crawler(url) {
        browser = browser.url(url);
        browser = browser.waitForVisible('body', 15000).getHTML('body').then((content) => {
            this.readConfig();
            let hrefs = this.getHrefs(content);
            for (let i = 0; i < hrefs.length; i++) {
                if (this.set.indexOf(hrefs[i]) === -1) {
                    this.set.push(hrefs[i]);
                    this.queue.push(hrefs[i]);
                }
            }
            let url = this.queue.pop();
            console.log(url);
            if (url) {
                this.crawler(url);
            }
        });
    }
    start() {
        browser = browser.url('https://' + this.domain + '/robots.txt')
            .getSource()
            .then((content) => {
                this.parseRobotsTxt(content);
            }).then(() => {
                this.crawler('https://' + this.domain);
            });
    }
};