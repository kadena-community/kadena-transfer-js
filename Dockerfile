FROM nginx:1.17.5

ENV GIT_URL https://github.com/obsidiansystems/kadena-transfer-js.git

RUN apt-get -y update \
&& apt-get -y install git \
&& git clone -b hw-ledger-signing ${GIT_URL} \
&& cp -r /kadena-transfer-js/* /usr/share/nginx/html
