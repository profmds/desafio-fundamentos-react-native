import React, {
  createContext,
  useState,
  useCallback,
  useContext,
  useEffect,
} from 'react';

import AsyncStorage from '@react-native-community/async-storage';

interface Product {
  id: string;
  title: string;
  image_url: string;
  price: number;
  quantity: number;
}

// No contexto de adição vindo do Dashboard, não existe quantidade
// Contudo para o carrinho a quantidade é essencial
// por isso utilizamos a Classe Omit, para omitir do parâmetro de produtos vindo
// do dashboard a quantidade, ela só é inserida no contexto do Carrinho
interface CartContext {
  products: Product[];
  addToCart(item: Omit<Product, 'quantity'>): void;
  increment(id: string): void;
  decrement(id: string): void;
}

const CartContext = createContext<CartContext | null>(null);

const CartProvider: React.FC = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    async function loadProducts(): Promise<void> {
      // uma variável recebe o retorno do AsyncStorage, onde vão ficar armazenados dos produtos
      // que forem adicionados a aplicação.
      AsyncStorage.clear();

      const storagedProducts = await AsyncStorage.getItem(
        '@GoMarketplace:cart',
      );
      // console.log(storagedProducts);
      // se existir algum valor os produtos por padrão recebe o AsyncStorage como uma string
      // os produtos então são convertidos em objeto pelo JSON.parse
      if (storagedProducts) {
        setProducts(JSON.parse(storagedProducts));
      }
    }
    loadProducts();
  }, []);

  const addToCart = useCallback(
    async (product: Product) => {
      // Foi necessário alterar o parâmetro do product da arrow function
      // Para que seja possível adicionar o produto ao carrinho, devemos pensar no estado de imutabilidade
      // Para isso precisamos imaginar que já pode ocorrer de existir produtos no carrinho
      // Sendo ele diferente ou igual
      // Inicialmente vamos resgatar todos os produtos
      const newProductsAddToCart = [...products];
      // em seguida, é necessário verificar se o produto adicionado já existe,
      // como a flatList usa o KeyExtrator como registro único isso dará uma inconsistência na lista
      // no caso de incrementar ou remover pode dar um efeito colateral indesejado
      // por isso é preciso consultar qual o índice para comparar a unicidade
      // utilizando a função findIndex da variável de estados dos produtos tentamos recuperar
      // qualquer produto que possa ter um id igual ao id do produto que estamos recebendo na
      // função addToCart
      const productIndex = products.findIndex(
        productFound => productFound.id === product.id,
      );
      // Depois de resgatar os produtos, e verificar se o produto inserido é uma duplicata
      // é necessário realizar uma condicional
      // caso hajam produtos, apenas adicionaremos uma quantidade ao já existente
      // Caso contrário vamos adicionar o produto que está sendo adicionado e a quantidade 1
      // E dar um push deste novo produto no array array
      // Considerando o método find está retornando a posição no array e que a primeira posição é 0
      // a condição veririca se é maior que -1 para que faça a incrementação
      // pois se for -1 significa que não existe nenhum elemento no carrinho deste id

      productIndex > -1
        ? (newProductsAddToCart[productIndex].quantity += 1)
        : newProductsAddToCart.push({ ...product, quantity: 1 });

      setProducts(newProductsAddToCart);
      // Depois enviamos ao AsyncStorage por meio do setItem os produtos recebidos
      // como o AsyncStorage precisa de valores string foi feita a conversão
      await AsyncStorage.setItem(
        '@GoMarketplace:cart',
        JSON.stringify(product),
      );
    },
    [products],
  );

  const increment = useCallback(
    async id => {
      // no contexto de incremento, o useCallback recebe o id como parâmetro
      // busca os produtos, dos produtos busca o índice e o mesmo é atualizado
      // neste caso não ferimos o princípio da imutabilidade pois só estamos alterando um valor
      // mas é necessário setar os produtos para que através dos estados eles possam ser atualizados na aplicação
      const productsOfCart = [...products];
      const productIndex = products.findIndex(
        productFound => productFound.id === id,
      );
      if (productIndex > -1) {
        productsOfCart[productIndex].quantity += 1;

        setProducts(productsOfCart);
      }

      await AsyncStorage.setItem(
        '@GoMarketplace:cart',
        JSON.stringify(productsOfCart),
      );
    },
    [products],
  );

  const decrement = useCallback(
    async id => {
      const productsOfCart = [...products];
      const productIndex = products.findIndex(
        productFound => productFound.id === id,
      );

      if (productIndex > -1 && productsOfCart[productIndex].quantity > 1) {
        productsOfCart[productIndex].quantity -= 1;

        setProducts(productsOfCart);
      }
      await AsyncStorage.setItem(
        '@GoMarketplace:cart',
        JSON.stringify(productsOfCart),
      );
    },
    [products],
  );

  const value = React.useMemo(
    () => ({ addToCart, increment, decrement, products }),
    [products, addToCart, increment, decrement],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

function useCart(): CartContext {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(`useCart must be used within a CartProvider`);
  }

  return context;
}

export { CartProvider, useCart };
