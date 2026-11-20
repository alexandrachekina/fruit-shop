# Fruit Shop API (local)

## Requirements
- Node.js installed

## Start
1. Open this folder in a terminal.
2. Run `npm install`
3. Run `npm start`
4. API base URL: `http://localhost:8082/api/products`

## Endpoints
- GET `/api/products`
- GET `/api/products/:id`
- POST `/api/products` with JSON `{ "name":"Kiwi", "price":2.3, "category":"Exotic", "stock":12, "description":"..." }`
- PUT `/api/products/:id` with the full product fields (name, price, category, stock, description)
- DELETE `/api/products/:id`

Products are stored in `products.json` and persist across server restarts.
