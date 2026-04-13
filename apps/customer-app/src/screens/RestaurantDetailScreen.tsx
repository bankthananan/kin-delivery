import React, { useEffect, useState } from 'react';
import { View, Text, SectionList, Button, StyleSheet, TouchableOpacity } from 'react-native';
import { api } from '../services/api';
import { useCartStore } from '../store/cartStore';

export const RestaurantDetailScreen = ({ route, navigation }: any) => {
  const { id } = route.params;
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menu, setMenu] = useState<any[]>([]);
  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resRes, menuRes] = await Promise.all([
          api.get(`/restaurants/${id}`),
          api.get(`/restaurants/${id}/menu`)
        ]);
        setRestaurant(resRes.data);
        const sections = menuRes.data.map((cat: any) => ({
          title: cat.name,
          data: cat.items,
        }));
        setMenu(sections);
      } catch (err) {
        console.log('Failed to fetch restaurant details');
      }
    };
    fetchData();
  }, [id]);

  const handleAddToCart = (item: any) => {
    addItem(id, {
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
    });
  };

  if (!restaurant) return <View style={styles.container}><Text>Loading...</Text></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{restaurant.name}</Text>
        <Text>⭐ {restaurant.rating?.toFixed(1) || 'New'}</Text>
      </View>
      
      <SectionList
        sections={menu}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        renderItem={({ item }) => (
          <View style={styles.menuItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text>฿{item.price.toFixed(2)}</Text>
            </View>
            <Button title="Add to Cart" onPress={() => handleAddToCart(item)} />
          </View>
        )}
      />

      {cartItems.length > 0 && (
        <TouchableOpacity style={styles.cartBar} onPress={() => navigation.navigate('Cart')}>
          <Text style={styles.cartText}>View Cart ({cartItems.length} items)</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 24, fontWeight: 'bold' },
  sectionHeader: { padding: 10, fontSize: 18, fontWeight: 'bold', backgroundColor: '#f9f9f9' },
  menuItem: { flexDirection: 'row', padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  itemName: { fontSize: 16, fontWeight: '500' },
  cartBar: { padding: 15, backgroundColor: '#00cc66', alignItems: 'center' },
  cartText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
