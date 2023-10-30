const express = require("express");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 4000;
const app = express();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
// middleware

app.use(express.json());
app.use(
  cors({
    origin: [
      // "http://localhost:5173",
      "https://drivy-auth.web.app",
      "https://drivy-auth.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(cookieParser());

// jwt token verifier middleware
const verifier = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    res.status(401).send({ message: "unauthorized access" });
    return;
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized Access" });
    } else {
      req.user = decoded;
      console.log(decoded);
      next();
    }
  });

  console.log("token in mdidleware", token);
  // next();
};
// initial endpoints

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.db_user}:${process.env.db_pass}@cluster0.lzg5hog.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
    // collections
    const brandCollection = client.db("drivyDB").collection("brands");
    const carCollection = client.db("drivyDB").collection("cars");
    const cartCollection = client.db("drivyDB").collection("cart");
    // auth related api

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });

    // data related api
    //post brand data
    app.post("/brands", async (req, res) => {
      const data = req.body;
      const result = await brandCollection.insertOne(data);
      res.send(result);
    });
    //get all brand data
    app.get("/brands", async (req, res) => {
      const result = await brandCollection.find().toArray();
      res.send(result);
    });
    //post car data
    app.post("/cars", async (req, res) => {
      const data = req.body;
      const result = await carCollection.insertOne(data);
      res.send(result);
    });
    //get all car data
    app.get("/cars", async (req, res) => {
      const result = await carCollection.find().toArray();
      res.send(result);
    });
    // get multiple  car data with brand name
    app.get("/cars/:brand_name", async (req, res) => {
      const brand_name = req.params.brand_name;
      const query = { brand_name: brand_name };
      const result = await carCollection.find(query).toArray();
      res.send(result);
    });
    // get single car data
    app.get("/car/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await carCollection.findOne(query);
      res.send(result);
    });
    //update single car data
    app.put("/car/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedCar = {
        $set: {
          ImageURL: data.ImageURL,
          brand_name: data.brand_name,
          Name: data.Name,
          type: data.type,
          price: data.price,
          rating: data.rating,
          short_description: data.short_description,
        },
      };
      const result = await carCollection.updateOne(filter, updatedCar, options);
      res.send(result);
    });
    // get cart data
    app.get("/cart", async (req, res) => {
      const result = await cartCollection.find().toArray();
      res.send(result);
    });
    // post cart data

    app.post("/cart", async (req, res) => {
      const car = req.body;
      const result = await cartCollection.insertOne(car);
      res.send(result);
    });
    //get  cart data by name
    app.get("/cart/:name", async (req, res) => {
      const name = req.params.name;
      const query = { name: name };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });
    //get  cart data by email
    app.get("/carts/:email", verifier, async (req, res) => {
      const email = req.params.email;
      if (req.user.email !== email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });
    //delete card data by id
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });
    //delete many
    app.delete("/cart/:email", async (req, res) => {
      const email = req.params.email;
      console.log(email);
      const query = { email: email };
      const result = await cartCollection.deleteMany(query);
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(port, () => {
  console.log(`listening on ${port}`);
});
