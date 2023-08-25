require('dotenv').config();
// const cron = require('node-cron');
const puppeteer = require('puppeteer');
const axios = require('axios').default;


async function scrapeAndSaveReviews() {

  try {
    const apiUrl = process.env.API_HOST;
    const apiKey = process.env.API_TOKEN;
    console.log('Функция scrapeReviews выполняется автоматически.');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--disable-translate']
    });
    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({
      'Accept-Language': 'uk-UA,uk;q=0.9',
    });

    await page.goto('https://www.google.com/maps/place/%D0%A6%D0%95+-+%D0%A6%D0%B5%D0%BD%D1%82%D1%80%D0%B8+%D0%95%D0%B4%D1%83%D0%BA%D0%B0%D1%86%D1%96%D1%97/@49.832689,24.0122356,12z/data=!4m8!3m7!1s0x473add32088aee89:0xac4ea9a7960ede46!8m2!3d49.832689!4d24.0122356!9m1!1b1!16s%2Fg%2F11r7w1cp8_?entry=ttu');

    await page.waitForSelector('.bJzME.tTVLSc');

    await page.evaluate(async () => {
      const reviewElement = document.querySelector('.m6QErb.DxyBCb.kA9KIf.dS8AEf');

      await new Promise((resolve) => {
        const scrollInterval = setInterval(() => {
          reviewElement.scrollTop += reviewElement.clientHeight;
          if (reviewElement.scrollHeight - reviewElement.scrollTop === reviewElement.clientHeight) {
            clearInterval(scrollInterval);
            resolve();
          }
        }, 2000);
      });
    });


    await page.waitForTimeout(3000);
    const reviews = await page.evaluate(async () => {

      const reviewElements = Array.from(document.querySelectorAll('.jftiEf '));

      const newReviews = [];
      for (const reviewElement of reviewElements) {
        const authorElement = reviewElement.querySelector('.d4r55');
        const ReviewerName = authorElement ? authorElement.textContent : '';

        const ratingElement = reviewElement.querySelector('.kvMYJc');
        const rating = ratingElement ? ratingElement.getAttribute('aria-label').replace(/[^0-9.]/g, '') : '';

        const commentElement = reviewElement.querySelector('.wiI7pd');
        const ReviewText = commentElement ? commentElement.textContent : '';

        newReviews.push({
          ReviewerName,
          ReviewText,
          rating,
        })
      }

      return newReviews;
    });

    await browser.close();

    const existingReviews = await axios.get(`http://${apiUrl}/reviews`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    const checkIfReviewExists = (ReviewerName) => {
      if (existingReviews.data.data) {
        for (const review of existingReviews.data.data) {
          if (review.attributes.ReviewerName === ReviewerName) {
            return true;
          }
        }
      }
      else {
        return false;
      }
    };

    const uniqueReviews = [];
    for (const reviewData of reviews) {
      if (!checkIfReviewExists(reviewData.ReviewerName)) {
        uniqueReviews.push(reviewData);
      }
    }

    for (const reviewData of uniqueReviews) {
      await axios.post(
        `http://${apiUrl}/reviews`,
        {
          data: reviewData,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }
      );
    }
    console.log('Отзывы успешно скраппены и сохранены');
  } catch (error) {
    console.error(error);
    console.log('Произошла ошибка при скрапинге и сохранении отзывов');
  }
}

// Schedule the task to run every week on Monday at 00:00 (midnight)
// cron.schedule('0 0 * * 1', async () => {
//     await scrapeAndSaveReviews();
// });

scrapeAndSaveReviews()