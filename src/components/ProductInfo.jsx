const ProductInfo = () => {
    const product = {
        name: "Laptop",
        price: 1200,
        availability: "In stock",
    }

  return (
    <div>
        <p>{product.name} {product.price} {product.availability}</p>
    </div>
  )
}

export default ProductInfo