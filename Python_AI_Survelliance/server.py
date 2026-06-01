from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse
from twilio.twiml.voice_response import VoiceResponse, Gather

app = Flask(__name__)

@app.route("/voice", methods=['GET', 'POST'])
def voice():
    """This function responds to incoming calls with a TwiML message."""
    # Create a TwiML response
    response = VoiceResponse()

    # Use the <Gather> verb to collect user input
    gather = Gather(num_digits=1, timeout=10)
    gather.say("To mark this as a false alarm, please press one.")

    # If the user doesn't press anything, just say goodbye
    response.append(gather)
    response.say("We did not receive any input. Goodbye.")
    response.hangup()

    return str(response)

@app.route("/sms", methods=['GET', 'POST'])
def sms_reply():
    """This function replies to an incoming text message."""
    # Get the body of the incoming message
    message_body = request.form['Body']

    # Start our TwiML response
    response = MessagingResponse()

    # Check if the message is a "stop" command
    if message_body.lower().strip() == "stop":
        response.message("Alerts have been stopped.")
        print("Received 'stop' command. Halting alert process.")
        # Here's where your app logic would halt the call
        # This is a conceptual step, you will need to implement
        # the actual halting logic in your main script
    else:
        response.message("Thanks for the message! Type 'stop' to halt alerts.")

    return str(response)

if __name__ == "__main__":
    app.run(debug=True, port=5000)