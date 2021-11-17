//index.js
//获取应用实例
const app = getApp()

Page({
  data: {
    deviceName: "sakuraneko-04",
    isConnected: false,
    isFailed: true,
    isFinded: false,
    command: ''
  },
  onConnect() {
    let that = this;
    wx.openBluetoothAdapter({
      success: function(res) {
        if (!that.data.isConnected) {
          that.startBluetoothDevicesDiscovery();
          wx.showLoading({
            title: '搜索中',
          })
        }
      },
      fail: function(res) {
        wx.showToast({
          title: '请先开启蓝牙',
          icon: 'none',
          duration: 1000
        })
      }
    });
  },
  startBluetoothDevicesDiscovery: function() {
    var that = this;
    wx.startBluetoothDevicesDiscovery({
      success: function(res) {
        console.log("discovery", res);
        if (res.errCode == 0) {
          that.getConnect();
        }
      },
    });
  },
  getConnect: function() {
    var that = this;
    var timer = setInterval(function() {
        wx.getBluetoothDevices({
          success: function(res) {
            console.log("devices", res);
            for (var i = 0; i < res.devices.length; i++) {
              if (res.devices[i].name == that.data.deviceName) {
                wx.hideLoading();
                wx.showLoading({
                  title: '连接中',
                })
                that.setData({
                  isFinded: true
                });
                clearInterval(timer);
                that.setData({
                  deviceId: res.devices[i].deviceId
                });
                console.log('设备号', that.data.deviceId);
                console.log("开始尝试建立连接");
                wx.createBLEConnection({
                  deviceId: that.data.deviceId,
                  timeout: 10000,
                  success: function(res) {
                    console.log(res);
                    if (res.errCode == 0) {
                      console.log('连接成功')
                      that.setData({
                        isConnected: true
                      });
                      wx.stopBluetoothDevicesDiscovery();
                    } else {
                      wx.showModal({
                        title: '提示',
                        content: '不能正常对蓝牙设备进行连接',
                        showCancel: false
                      })
                    }
                  },
                  fail: (res) => {
                    wx.hideLoading();
                    if (res.errCode == 10012) {
                      wx.showModal({
                        title: '提示',
                        content: '连接超时',
                        showCancel: false
                      })
                    }
                    console.warn("fail", res);
                  },
                  complete: () => {
                    wx.hideLoading();
                  }
                })
                break;
              }
            }
          }
        });
      },
      3000);
    setTimeout(function() {
      if (!that.data.isFinded && !that.data.isConnected) {
        clearInterval(timer);
        that.setData({
          isFailed: false
        });
        wx.hideLoading();
        wx.showModal({
          title: '提示',
          content: '搜索蓝牙超时',
          showCancel: false
        })
      }
    }, 12000);
  },
  sendCommand(i) {
    let _this = this;
    if (i < chunkCount) {
      let subCommand = subCommads[i]
      wx.writeBLECharacteristicValue({
        deviceId,
        serviceId,
        characteristicId,
        value: _this.str2ab(subCommand),
        success: function(res) {
          setTimeout(function() {
            send(i + 1)
          }, 20)
        },
        fail: function(res) {
          fail("fail", res)
        }
      })
    }
  },
  str2ab(str) {
    var buf = new ArrayBuffer(12);
    let dataView = new DataView(buf);
    dataView.setUint8(0, 0xa1);
    dataView.setUint8(1, 0x08);
    dataView.setUint8(2, 0x01);
    dataView.setUint8(3, 0x00);
    dataView.setUint8(4, 0x00);
    dataView.setUint8(5, 0x00);
    dataView.setUint8(6, 0x64);
    dataView.setUint8(7, 0x1e);
    dataView.setUint8(8, 0x00);
    dataView.setUint8(9, 0x32);
    dataView.setUint8(10, 0x61);
    dataView.setUint8(11, 0x55);
    console.log(dataView);
    return dataView
  },
  ab2hex(buffer) {
    var hexArr = Array.prototype.map.call(new Uint8Array(buffer), function(bit) {
      return ('00' + bit.toString(16)).slice(-2)
    })
    return hexArr.join('');
  },
  onCommand(e) {
    this.setData({
      command: e.detail.value
    })
  },
  onSendCommand() {
    let that = this;
    if (that.data.serviceId && that.data.characteristicId) {
      wx.writeBLECharacteristicValue({
        deviceId: that.data.deviceId,
        serviceId: that.data.serviceId,
        characteristicId: that.data.characteristicId,
        value: that.str2ab(that.data.command),
        success: function(res) {
          // setTimeout(function () {
          //   send(i + 1)
          // }, 20)
          console.log("发送指令成功");
          wx.showToast({
            title: '发送成功',
            icon: 'none'
          })
        },
        fail: function(res) {
          console.warn("发送指令失败", res)
        }
      })
    }else{
      wx.showModal({
        title: '提示',
        content: '请先获取设备信息',
        showCancel:false
      })
    }
  },
  onGetuuid(){
    let that = this;
    if(that.data.isConnected && that.data.isFailed){
    wx.showLoading({
      title: '获取serviceId',
    })
    console.log("开始获取设备信息");
    wx.getBLEDeviceServices({
      deviceId: that.data.deviceId,
      success(getServicesRes) {
        console.log("getServicesRes", getServicesRes);
        let service = getServicesRes.services[1]
        let serviceId = service.uuid
        console.log(serviceId);
        wx.showLoading({
          title: '获取characteristicId',
        })
        wx.getBLEDeviceCharacteristics({
          deviceId: that.data.deviceId,
          serviceId: serviceId,
          success(getCharactersRes) {
            console.log("getCharactersRes", getCharactersRes);
            wx.hideLoading();
            let characteristic = getCharactersRes.characteristics[0]
            let characteristicId = characteristic.uuid
            that.setData({
              serviceId: serviceId,
              characteristicId: characteristicId
            })
            console.log('成功获取uuId', that.data.serviceId, that.data.characteristicId);
            wx.notifyBLECharacteristicValueChange({
              state: true,
              deviceId: that.data.deviceId,
              serviceId: serviceId,
              characteristicId: getCharactersRes.characteristics[1].uuid,
              success() {
                console.log('开始监听特征值')
                wx.onBLECharacteristicValueChange(function (onNotityChangeRes) {
                  console.log('监听到特征值更新', onNotityChangeRes);
                  let characteristicValue = that.ab2hex(onNotityChangeRes.value);
                  wx.showModal({
                    title: '监听到特征值更新',
                    content: `更新后的特征值(16进制格式):${characteristicValue}`,
                    showCancel: false
                  })
                })
              },
              fail: (res) => {
                console.warn("监听特征值失败");
              }
            })
          },
          fail: (res) => {
            console.warn("获取特征值信息失败", res);
          },
          complete: (res) => {
            console.log('获取服务信息完成',res);
            wx.hideLoading();
          }
        })
      },
      fail: (res) => {
        console.warn("获取服务信息失败", res);
      },
      complete: () => {
        wx.hideLoading();
      }
    })
    }else{
      wx.showToast({
        title: '请先连接蓝牙',
      })
    }
  },
  onCloseConnect(){
    this.setData({
      isConnected:false,
      isFinded:false
    })
    wx.closeBLEConnection({
      deviceId: this.data.deviceId,
      success: function(res) {
        console.log("成功断开连接");
        wx.showToast({
          title: '成功断开连接',
        })
      },
    })
  }
})