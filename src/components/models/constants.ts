// src/constants.ts
export enum Character {
    TenkoShibuki = 0,
    HanakoNana = 1,
    YuzuhaRiko = 2,
    AokumoriRin = 3
  }
  
  export const CHARACTER_INFO = {
    [Character.TenkoShibuki]: {
      name: "텐코 시부키",
      color: "#C2AFE6",
      sound: "/asset/shibuki/debakbak.mp3",
      popupMessage: "+대박박"
    },
    [Character.HanakoNana]: {
      name: "하나코 나나", 
      color: "#DF7685",
      sound: "/asset/shibuki/gomapdei.mp3",
      popupMessage: "+고맙데이"
    },
    [Character.YuzuhaRiko]: {
      name: "유즈하 리코",
      color: "#A6D0A6", 
      sound: "/asset/shibuki/hiyongsa.mp3",
      popupMessage: "+하이용사"
    },
    [Character.AokumoriRin]: {
      name: "아오쿠모 린",
      color: "#2B66C0",
      sound: "/asset/shibuki/nyo.mp3", 
      popupMessage: "+뇨!"
    }
  };
  
  export const GAME_VERSION = "1.3.2";