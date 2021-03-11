const { MonoApiHelper, MonoApi } = require('frida-mono-api')

let ignored_fn = [
    'get_IsInAction',
    'get_IsInTurnWait',
    'UpdateGameCameraRotation',
    'UpdateHandCards',
    'CheckBattleFrameworkEnded',
    'get_SceneInArmed',
'get_IsGalleryScene',
'Update',
'IsMouseButtonDown',
'UpdateOmniCam',
    'AddCameraDistance',

]

function traceClass(klassInst) {
    console.log("Tracing klass");
    let klassName = MonoApiHelper.ClassGetName(klassInst);
    let methods = MonoApiHelper.ClassGetMethods(klassInst);
    for (let i = methods.length - 1; i >= 0; i--) {
        let method = methods[i];
        let name = MonoApiHelper.MethodGetName(method, klassInst);
        console.log("METHOD: " + name)

        if (ignored_fn.indexOf(name) >= 0) {
            continue;
        }

        try {
            MonoApiHelper.Intercept(klassInst, name, {
                onEnter: function (args) {
                    this.instance = args[0];
                    console.log(klassName + "::" + name + "(" + args[1].toString() + ", " + args[2].toString() + ", ...)");
                }
            })
        } catch (e) {
            console.log("Aw, snap.", e)
        }
    }

    let fields = MonoApiHelper.ClassGetFields(klassInst);
    for (let i = fields.length - 1; i >= 0; i--) {
        let field = fields[i];
        let name = MonoApiHelper.FieldGetName(field);
        console.log("FIELD: " + name);
    }
}

function getClassByName(name) {
    let klassInst = 0
    MonoApiHelper.AssemblyForeach(assy => {
        if (klassInst != 0) return;
        const img = MonoApi.mono_assembly_get_image(assy);
        klassInst = MonoApiHelper.ClassFromName(img, name);
    });

    return klassInst;
}

const klass = getClassByName("BattleFramework")
const sceneKlass = getClassByName("EventSceneFramework")

// noinspection EqualityComparisonWithCoercionJS
if (klass != 0) {
    traceClass(klass)
    MonoApiHelper.Intercept(klass, "OnClickCardSpell", {
        onEnter: function(args) {
            this.instance = args[0];
            // Buttplug short vibe
            console.log("Card Clicked: ", args[1], args[2]);
            send('ON_CARD');
        },
    })

    MonoApiHelper.Intercept(klass, "CreateDamageViewer", {
        onEnter: function(args) {
            this.instance = args[0];
            // Buttplug long vibe
            console.log("Damage: ", args[1], args[2].toInt32());
            send({ message: 'ON_DAMAGE', target: args[1].toString, damage: args[2].toInt32()} );
        },
    })
}

// noinspection EqualityComparisonWithCoercionJS
if (sceneKlass != 0) {
    traceClass(sceneKlass)

    MonoApiHelper.Intercept(sceneKlass, "OnAnimationEvent", {
        onEnter: function(args) {
            this.instance = args[0];
            send({ message: 'ON_ANIMATION_EVENT', index: 'none' })
        }
    })

    MonoApiHelper.Intercept(sceneKlass, "SetAnimIndex", {
        onEnter: function(args) {
            this.instance = args[0];
            const index = args[1].toInt32();
            send({ message: 'ON_ANIMATION_EVENT', index: index })
        }
    })

    MonoApiHelper.Intercept(sceneKlass, "GetIncrease", {
        onEnter: function(args) {
            this.instance = args[0];
            const increase = args[1].toInt32();
            send({ message: 'ON_ANIMATION_EVENT', index: increase, type: 'GetIncrease'})
        }
    })
}

[
    "AnimCombineEventerViewer",
    "CinematicFramework",
    "EntranceFramework",
    "EscapeFramework",
    "EventSceneFramework",
    "GameManager"
].forEach(klassName => {
    const klassInst = getClassByName(klassName)
    console.log(klassInst);
    if (klassInst != 0) {
        traceClass(klassInst);
    }
})


// Curious Names:
// SetIncrease_Mouth
// OnAnimationEvent
// SetAnimIndex