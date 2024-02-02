import express from 'express';
import cors from 'cors'; 
import connect from './db.js'
import categoriesSchema from './schemasMongoose/categoriesSchema.js';
import productsSchema from './schemasMongoose/productsSchema.js';
import characteristicsSchema from './schemasMongoose/characteristicsSchema.js';
import startServer from './startServer.js';
import path from 'path';
import __dirname from './__dirname.js';
import { pagination } from './helpers/pagination.js';
import { getAmountPages } from './helpers/helpers.js';

const PORT = 3000;
let app = express();
app.use(cors());
app.use('/assets', express.static(path.join(__dirname, 'assets')));

const mongoose = connect()

startServer(PORT, app) 

const CategoriesModel = mongoose.model('Categories', categoriesSchema)
const ProductsModel = mongoose.model('Products', productsSchema)
const CharacteristicsModel = mongoose.model('Characteristics', characteristicsSchema)

app.get('/', async function(req, res) {
 
     const response = await CategoriesModel.find({})
        .exec()
        .then(result => res.json(result))
        .catch(err => console.error('Error:', err))
  
});
app.get('/get/products/category/', async function(req, res) {
        const id = req.query.id
        try {
                if (id) {
                        const result = await ProductsModel.find({parent_id: id})
                        console.log(result);
                }
        } catch (error) {
                console.error(err);
                res.status(500).json({ error: 'Internal Server Error' });
        }
})

app.get('/get/products/', async function(req, res) {
        try {   
                let currentPageNumber = parseInt(req.query.page)
                const object = {}
                const limit = 9;
                let skipAmount = 0
                console.log(req.query, 'sssss');
                if (currentPageNumber > 1) {
                        skipAmount = (currentPageNumber-1)*limit
                }
                
                if (req.query.id) {
                        object.category_id = req.query.id
                        console.log(object);
                }
                if (req.query.minPrice) {
                        object.price = {$gte: parseInt(req.query.minPrice)};
                        console.log(object, '===============');
                      }
                if (req.query.maxPrice) {
                        
                        if (!object.price) {
                        object.price = {};
                        }
                        object.price.$lte = parseInt(req.query.maxPrice);
                }
                      
                const result = await ProductsModel.find(object)
                        .select('name price photo')
                        .limit(limit)
                        .skip(skipAmount)
                        .exec();
      
                const amountPages = await getAmountPages(ProductsModel, object, limit)
                const paginationPageNumbers = pagination(currentPageNumber, amountPages)

                const updatedResults = result.map(product => {
                        return {
                                _id: product._id,
                                name: product.name,
                                price: product.price,
                                photo: path.posix.join('/assets/img/products/', product.photo[0]),
                        };
                });
                
                const formattedJson = JSON.stringify({
                        products: updatedResults,
                        paginationPageNumbers: paginationPageNumbers,
                        amountPaginationPages: amountPages,
                      }, null, 1);
                  
                      res.set('Content-Type', 'application/json');
                      res.send(formattedJson);
        } catch (err) {
                console.error(err);
                res.status(500).json({ error: 'Internal Server Error' });
        }
});

app.get('/get/product/details/', async function(req, res) {

try {
        
        const _id = req.query.id
        const productDetails = await ProductsModel.findOne({ _id: _id })
        .select('name price photo characteristics category_id description')
        .exec();
        

        for (const elem of productDetails.characteristics) {

                const itemId = Object.keys(elem)[0]
                const item = await CharacteristicsModel.findOne({_id: itemId})
                elem.name = item.name
                elem.specifitacions = Object.values(elem)[0]
                delete elem[itemId]
        }
       

        if (productDetails) {

                const productJson = productDetails.toJSON({
                        virtuals: false,
                        transform: (doc, ret) => {
                          delete ret._id;
                          return ret;
                        },
                      });
                      
                      const formattedJson = JSON.stringify({
                        ...productJson,
                        photo: productJson.photo.map(photo => '/assets/img/products/' + photo),
                        category_id: productJson.category_id, 
                      }, null, 1);

            res.set('Content-Type', 'application/json');
            res.send(formattedJson);

        } else {
                res.status(404).json({ error: 'Product not found' });
        }

} catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
}
});            


      
