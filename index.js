import PogObject from "../PogData"
import request from "requestV2"
const modMessage = (message) => ChatLib.chat(`&c[Spotify Lyrics] &6${message}`)

export const config = new PogObject("SpotifyLyrics", {
    lyrics: false,
    y: 40
})
config.save()

register("command", (...args) => {
    if (args[0] === 'lyrics') {
        config.lyrics = !config.lyrics
        config.save()
        modMessage(`Lyrics is now ${config.lyrics ? "§aEnabled" : "§cDisabled"}§b.`)
    }
    else if (args[0] === 'y') {
        if (!args[1]) return modMessage(`Y is ${config.y}`)
        config.y = parseInt(args[1])
        config.save()
        modMessage(`Set y to ${config.y}`)
    }
}).setName("cf")

const ProcessBuilder = Java.type("java.lang.ProcessBuilder")
const Scanner = Java.type("java.util.Scanner")
const os = Java.type("java.lang.System").getProperty("os.name").toLowerCase()
modMessage(`OS: ${os}`)
let current = {
    "name": "",
    "artists": "",
    "displayName": ""
}

let spotifyPID = -1
const updateSpotify = () => {

    current.name = "&cNot open"

    if (spotifyPID !== -1) {
        let pid = spotifyPID

        let process = new ProcessBuilder("tasklist.exe", "/FO", "csv", "/V", "/FI", "\"PID eq " + pid + "\"").start()
        let sc = new Scanner(process.getInputStream())
        if (sc.hasNextLine()) sc.nextLine()
        while (sc.hasNextLine()) {
            let line = sc.nextLine()
            let parts = line.replace("\"", "").split("\",\"")
            let song = parts[parts.length - 1].substr(0, parts[parts.length - 1].length - 1)
            if (song === "N/A") continue

            if (song === "Spotify Free" || song === "Spotify Premium" || song === "AngleHiddenWindow") {
                current.name = "&cPaused"
            } else {
                if (song === "Spotify") {
                    song = "Advertisement"
                    current.name = "&cAdvertisement"
                } else {
                    current.name = song.replace(/&/g, "&⭍").split("-")[1]
                    current.artists = song.replace(/&/g, "&⭍").split("-")[0]
                }
            }

        }
        process.waitFor()


        if (current.name != undefined) {
            current.name = current.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            current.displayName = current.name
        } else {
            current.displayName = "undefined?"
        }

    }

    if (current.name !== "&cNot open") return

    spotifyPID = -1
    let spotifyProcesses = []
    let process = new ProcessBuilder("tasklist.exe", "/fo", "csv", "/nh").start()
    let sc = new Scanner(process.getInputStream())
    if (sc.hasNextLine()) sc.nextLine()
    while (sc.hasNextLine()) {
        let line = sc.nextLine()
        let parts = line.replace("\"", "").split("\",\"")
        let unq = parts[0]
        let pid = parts[1]
        if (unq === "Spotify.exe") {
            spotifyProcesses.push(pid)
        }
    }
    process.waitFor()

    while (spotifyProcesses.length > 0) {
        let pid = spotifyProcesses.pop()
        // console.log("Loading pid " + pid)
        let process = new ProcessBuilder("tasklist.exe", "/FO", "csv", "/V", "/FI", "\"PID eq " + pid + "\"").start()
        let sc = new Scanner(process.getInputStream())
        if (sc.hasNextLine()) sc.nextLine()
        while (sc.hasNextLine()) {
            let line = sc.nextLine()
            let parts = line.replace("\"", "").split("\",\"")
            let song = parts[parts.length - 1].substr(0, parts[parts.length - 1].length - 1)
            if (song === "N/A") continue

            spotifyPID = pid

            if (song === "Spotify Free" || song === "Spotify Premium" || song === "AngleHiddenWindow") {
                current.name = "&cPaused"
            } else {
                if (song === "Spotify") {
                    song = "Advertisement"
                    current.name = "&cADvertisement"
                } else {
                    current.name = song.replace(/&/g, "&⭍").split("-")[1]
                    current.artists = song.replace(/&/g, "&⭍").split("-")[0]
                }

            }

        }
        process.waitFor()
    }

    if (current.name != undefined) {
        current.name = current.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        current.displayName = current.name
    } else {
        current.displayName = "undefined?"
    }
}

let lastSong = ''
register("step", () => {
    if (!config.lyrics) {
        infoToRender = ''
        lineToRender = ''
        nextLineToRender = ''
        return
    }
    new Thread(() => {
        updateSpotify()
        if (current.name && current.name !== lastSong && !current.name.includes("Advertisement") && !current.name.includes("Paused") && !current.name.includes("Not open")) {
            modMessage(`&fCurrently playing: &a${current.name} &fby &a${current.artists}`)
            getLyrics(current.name, current.artists)
            lastSong = current.name
        }
    }).start()
}).setDelay(1)
let timeToRequest = 0
const getContent = (url) => FileLib.getUrlContent(url)
const formatLink = (link) => link.replace(/ /g, "%20").replace(/'/g, "").replace(/"/g, "")
const getLyrics = (song, artist) => {
    let name = song.trim()
    artist = artist.trim()
    console.log(formatLink(`https://lyrix.vercel.app/getLyricsByName/${artist}/${name}`))
    /*
    new Thread(() => {
        let start = Date.now()
        const response = JSON.parse(getContent(`https://lyrix.vercel.app/getLyricsByName/${artist}/${name}`.replaceAll(" ", "%20").replaceAll("`", "").replaceAll(/"/g, "")))
        timeToRequest = Date.now() - start
        //modMessage(`Fetched lyrics in ${timeToRequest}ms`)
        displayLyrics(response.lyrics.lines, song, artist)
    }).start()
    */
    request({
        url: formatLink(`https://lyrix.vercel.app/getLyricsByName/${artist}/${name}`),
        json: true
    }).then(response => {
        console.log(JSON.stringify(response))
        timeToRequest = 0 //Date.now() - start
        displayLyrics(response.lyrics.lines, song, artist)
    }).catch(error => {
        modMessage(`Failed to fetch lyrics: ${error}`)
    })

}
let lineToRender = ''
let nextLineToRender = ''
let infoToRender = ''
const displayLyrics = (lines, name, artist) => {
    let continueLyrics = true
    infoToRender = `${artist} - ${name}`
    new Thread(() => {
        let wait = timeToRequest
        lines.forEach((line, index) => {
            if (!continueLyrics) return
            let time = line.startTimeMs - wait
            wait = line.startTimeMs
            if (time <= 0) time = 1
            Thread.sleep(time)
            if (!continueLyrics) return
            if (lastSong !== name) {
                lineToRender = ''
                nextLineToRender = ''
                continueLyrics = false
            }
            lineToRender = line.words
            nextLineToRender = lines[index + 1] ? lines[index + 1].words : ''
            infoToRender = `${artist} - ${name}`
        })
    }).start()
}

register("renderOverlay", () => {
    Renderer.drawString("&0&n" + infoToRender, Renderer.screen.getWidth() - Renderer.getStringWidth(infoToRender) - 5, config.y)
    Renderer.drawStringWithShadow("&a" + lineToRender, Renderer.screen.getWidth() - Renderer.getStringWidth(lineToRender) - 5, config.y + 20)
    Renderer.drawStringWithShadow("&f" + nextLineToRender, Renderer.screen.getWidth() - Renderer.getStringWidth(nextLineToRender) - 5, config.y + 40)
})