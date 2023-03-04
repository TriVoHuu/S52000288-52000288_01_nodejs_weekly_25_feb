const express = require('express')
const morgan = require('morgan')
const hbs = require('express-handlebars')
const multer = require('multer')
const upload = multer({
    dest: 'uploads', fileFilter: (req, file, callback) => {
        if (file.mimetype.startsWith('image/')) {
            callback(null, true)
        } else {
            callback(null, false)
        }
    }, limits: { fileSize: 500000 }
})
const uuid = require('short-uuid')
const session = require('express-session')
const fs = require('fs')
const path = require('path')
const app = express()
const port = 3000
require('dotenv').config()

app.set('view engine', 'handlebars')
app.use('/uploads', express.static('uploads'))
app.use(session({ secret: 'secret_password_here' }))
app.use(morgan('combined'))
app.use(express.urlencoded({ extended: false }))
app.use(express.json())
app.engine('handlebars', hbs.engine({
    defaultLayout: 'main'
}))

let productList = new Map()

app.get('/', (req, res) => {
    if (!req.session.user) {
        res.redirect('/login')
    }
    else res.render('home', { products: productList.values() })
})

app.get('/product/:id', (req, res) => {
    let id = req.params.id
    let product = productList.get(id)
    res.render('product', { product })
})

app.get('/add', (req, res) => {
    res.render('add', { error: '', name: '', price: '', desc: '' })
})

app.post('/add', (req, res) => {
    let uploader = upload.single('image')

    uploader(req, res, err => {
        let { name, price, desc } = req.body
        let image = req.file
        let error = undefined

        if (!name || name.length === 0) {
            error = 'Vui lòng nhập tên'
        }
        else if (!price || price.length === 0) {
            error = 'Vui lòng nhập giá'
        }
        else if (isNaN(price) || parseInt(price) < 0) {
            error = 'Giá không hợp lệ'
        }
        else if (!desc || desc.length === 0) {
            error = 'Vui lòng nhập mô tả'
        }
        else if (err) {
            error = 'File too large'
        } else if (!image) {
            error = 'No image or invalid image'
        }

        if (error) {
            res.render('add', { error, name, price, desc })
        } else {
            let imagePath = `uploads/${image.originalname}`
            fs.renameSync(image.path, imagePath)

            let product = {
                id: uuid.generate(),
                name: name,
                price: parseInt(price),
                desc: desc,
                image: imagePath
            }

            productList.set(product.id, product)

            res.redirect('/')
        }
    })
})

app.get('/login', (req, res) => {
    if (req.session.user) {
        res.redirect('/')
    }
    else res.render('login', { email: '', password: '' })
})

app.post('/login', (req, res) => {

    let acc = req.body
    let error = ''

    if (!acc.email) {
        error = 'Vui lòng nhập email'
    }
    else if (!acc.password) {
        error = 'Vui lòng nhập password'
    }
    else if (acc.password.length < 6) {
        error = 'Mật khẩu phải lớn hơn 6 ký tự'
    }
    else if (acc.email !== process.env.EMAIL || acc.password !== process.env.PASSWORD) {
        error = 'Sai email hoặc mật khẩu'
    }

    if (error.length > 0) {
        res.render('login', { errorMessage: error, email: acc.email, password: acc.password })
    }
    else {
        req.session.user = acc.email
        res.redirect('/')
    }
})

app.post('/delete', (req, res) => {
    let { id } = req.body
    if (!id) {
        res.json({ code: 1, message: 'Mã sản phẩm không hợp lệ' })
    } else if (!productList.has(id)) {
        res.json({ code: 2, message: 'Không tìm thấy sản phẩm' })
    } else {
        let p = productList.get(id)
        productList.delete(id)
        res.json({ code: 0, message: 'Đã xoá sản phẩm thành công', data: p })
    }
})

app.use((req, res) => {
    res.end('Page not found!')
})

app.listen(3000, () => console.log(`Listening at http://localhost:${port}`))