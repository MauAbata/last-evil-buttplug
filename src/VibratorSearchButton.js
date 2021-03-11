import {useContext, useEffect, useState} from 'react'
import { ButtplugDeviceContext } from '@maustec/react-buttplug'
const { ipcRenderer } = window.require('electron')

const VibratorSearchButton = () => {
    const { buttplugReady, startScanning } = useContext(ButtplugDeviceContext);
    const [ scanning, setScanning ] = useState(false)
    const [ deviceList, setDeviceList ] = useState([])

    useEffect(() => {
        ipcRenderer.on('BT_DEVICE_SCAN', (event, data) => {
            const dl = JSON.parse(data);
            setDeviceList(dl);
        })
    }, [])

    const handleClick = (e) => {
        e.preventDefault();
        setScanning(true)
        startScanning()
            .then(console.log)
            .catch(console.error)
            .finally(() => {
                // setScanning(false);
            })
    }

    const connect = (deviceId) => (e) => {
        e.preventDefault()
        console.log("Connecting to " + deviceId);
        ipcRenderer.send("BT_DEVICE_CONNECT", deviceId);
        setScanning(false);
    }

    if (buttplugReady) {
        if (scanning) {
            return (
                <div>
                    <p>Scanning for Devices...</p>
                    <ul>
                        { deviceList.map(({deviceName, deviceId}) => <li key={deviceId}>
                            <button type={"button"} onClick={connect(deviceId)}>{ deviceName }</button>
                        </li>) }
                    </ul>
                </div>
            )
        }

        return (
            <a onClick={handleClick} href='#'>Start Searching</a>
        )
    } else {
        return (
            <p>Waiting for Buttplugs...</p>
        )
    }
}

export default VibratorSearchButton