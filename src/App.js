import React, {useContext, useEffect, useState} from 'react';
import VibratorSearchButton from './VibratorSearchButton'
import {ButtplugDeviceContext, ButtplugDeviceController} from "@maustec/react-buttplug";
const { ipcRenderer } = window.require('electron');

const App = () => {
    const [damage, setDamage] = useState(0);
    const [attached, setAttached] = useState(false);
    const [vibrateSpeed, setVibrateSpeed] = useState(0);

    const { devices } = useContext(ButtplugDeviceContext);
    let timeout = null;
    let interval = null;
    let taperSpeed = 0;

    const onDamage = (event, data) => {
        const { damage } = JSON.parse(data)
        setDamage(damage)

        const buzzDuration = 100 * Math.abs(damage)
        const buzzAmount = Math.max(0.5 + (damage / 40), 1.0)

        if (buzzDuration > 0) {
            if (timeout) clearTimeout(timeout)
            timeout = setTimeout(() => {
                setVibrateSpeed(0);
            }, buzzDuration);
            setVibrateSpeed(buzzAmount);
        }
    }

    let lastIndex = 0;

    const onAnimationEvent = (event, data) => {
        let { index, type } = JSON.parse(data)

        if (interval) clearInterval(interval)
        if (index == 'none') {
            index = lastIndex
        } else if(type == 'GetIncrease') {
            lastIndex = index * 2
        } else {
            lastIndex = index
        }

        taperSpeed = 0.7 + Math.min(0.3, (index/3) * 0.3)
        console.log(taperSpeed, index)
        setVibrateSpeed(taperSpeed)
        let pulseCount = 0;
        let delay = 300 * (index + 1)

        if (lastIndex > 3) {
            delay = 300
        }

        interval = setInterval(() => {
            if (lastIndex >= 2) {
                taperSpeed = (!taperSpeed) * 1.0
                setVibrateSpeed(Math.min(1.0, taperSpeed));
                pulseCount++;
                console.log("pulse: " , pulseCount, taperSpeed)
                if (pulseCount > lastIndex * 2) {
                    clearInterval(interval)
                }
                return
            }
            taperSpeed = taperSpeed - 0.1
            setVibrateSpeed(Math.max(taperSpeed, 0))
            console.log("vibrate speed", taperSpeed)
            if (taperSpeed <= 0)
                clearInterval(interval);
        }, delay);
    }

    useEffect(() => {
        ipcRenderer.off('ON_DAMAGE', onDamage)
        ipcRenderer.on('ON_DAMAGE', onDamage)

        ipcRenderer.off('ON_ANIMATION_EVENT', onAnimationEvent)
        ipcRenderer.on('ON_ANIMATION_EVENT', onAnimationEvent)

        ipcRenderer.on('ATTACHED', (event, data) => {
            setAttached(true);
        })
    }, [])

    const handleAttach = (e) => {
        e.preventDefault();
        setAttached(null)
        ipcRenderer.send("BIND", JSON.stringify({}))
    }

    if (attached) {
        return (
            <div>
                <VibratorSearchButton />
                <ul>
                    { devices.map((device) => (
                        <ButtplugDeviceController key={device.Index} device={device} vibrate={vibrateSpeed}>
                            <li>{device.Name}</li>
                        </ButtplugDeviceController>
                    ))}
                </ul>
                <h1>Last Damage: { damage }</h1>
            </div>
        )
    }

    if (attached === null) {
        return (
            <p>Attaching...</p>
        )
    }

    return (
        <a href={"#"} onClick={handleAttach}>attach to game</a>
    )

}

export default App