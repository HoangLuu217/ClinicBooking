import axios from 'axios';

const addressApi = {
  // Lấy danh sách tỉnh/thành phố - Dùng HTTP thay vì HTTPS để tránh lỗi SSL
  getProvinces: () => {
    return axios.get('http://provinces.open-api.vn/api/p/');
  },

  // Lấy danh sách quận/huyện theo tỉnh
  getDistricts: (provinceCode) => {
    return axios.get(`http://provinces.open-api.vn/api/p/${provinceCode}?depth=2`);
  },

  // Lấy danh sách phường/xã theo quận/huyện
  getWards: (districtCode) => {
    return axios.get(`http://provinces.open-api.vn/api/d/${districtCode}?depth=2`);
  },

  // Tìm tỉnh theo tên
  findProvinceByName: (provinces, name) => {
    if (!name || !provinces) return null;
    return provinces.find(p => {
      const provinceName = (p.province_name || p.name || '').toLowerCase().replace(/tỉnh|thành phố/g, '').trim();
      const searchName = name.toLowerCase().replace(/tỉnh|thành phố/g, '').trim();
      return provinceName === searchName || 
             provinceName.includes(searchName) || 
             searchName.includes(provinceName);
    });
  },

  // Tìm quận/huyện theo tên
  findDistrictByName: (districts, name) => {
    if (!name || !districts) return null;
    console.log('🔍 Searching district:', name);
    console.log('🔍 Available districts:', districts.map(d => d.district_name || d.name));
    
    return districts.find(d => {
      const districtName = (d.district_name || d.name || '').toLowerCase().replace(/huyện|quận|thị xã|thành phố/g, '').trim();
      const searchName = name.toLowerCase().replace(/huyện|quận|thị xã|thành phố/g, '').trim();
      
      console.log('🔍 Comparing:', districtName, 'vs', searchName);
      
      const exactMatch = districtName === searchName;
      const containsMatch = districtName.includes(searchName) || searchName.includes(districtName);
      
      if (exactMatch || containsMatch) {
        console.log('✅ Found district match:', d.district_name || d.name);
        return true;
      }
      return false;
    });
  },

  // Tìm phường/xã theo tên
  findWardByName: (wards, name) => {
    if (!name || !wards) return null;
    console.log('🔍 Searching ward:', name);
    console.log('🔍 Available wards:', wards.map(w => w.ward_name || w.name));
    
    return wards.find(w => {
      const wardName = (w.ward_name || w.name || '').toLowerCase().replace(/phường|xã|thị trấn/g, '').trim();
      const searchName = name.toLowerCase().replace(/phường|xã|thị trấn/g, '').trim();
      
      console.log('🔍 Comparing:', wardName, 'vs', searchName);
      
      const exactMatch = wardName === searchName;
      const containsMatch = wardName.includes(searchName) || searchName.includes(wardName);
      
      if (exactMatch || containsMatch) {
        console.log('✅ Found ward match:', w.ward_name || w.name);
        return true;
      }
      return false;
    });
  },

  // Parse địa chỉ từ string
  parseAddress: (addressString) => {
    if (!addressString) return null;
    
    const parts = addressString.split(',').map(part => part.trim());
    if (parts.length !== 3) return null;
    
    return {
      ward: parts[0],
      district: parts[1], 
      province: parts[2]
    };
  },

  // Parse địa chỉ với nhiều format khác nhau
  parseAddressFlexible: (addressString) => {
    if (!addressString) return null;
    
    // Thử parse với format "Xã, Huyện, Tỉnh"
    let parts = addressString.split(',').map(part => part.trim());
    if (parts.length === 3) {
      return {
        ward: parts[0],
        district: parts[1], 
        province: parts[2]
      };
    }
    
    // Thử parse với format khác
    const patterns = [
      /(.+?),\s*(.+?),\s*(.+)/,  // "Xã, Huyện, Tỉnh"
      /(.+?)\s+(.+?)\s+(.+)/,     // "Xã Huyện Tỉnh"
    ];
    
    for (const pattern of patterns) {
      const match = addressString.match(pattern);
      if (match) {
        return {
          ward: match[1].trim(),
          district: match[2].trim(),
          province: match[3].trim()
        };
      }
    }
    
    return null;
  }
};

export default addressApi;
