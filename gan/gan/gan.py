from numpy import randn, zeros, ones
from tensorflow.python.keras import Sequential
from tensorflow.python.keras.layers import Dense, BatchNormalization, Dropout


class GAN:
    def __init__(self):
        self.img_rows = 28
        self.img_cols = 28
        self.channels = 1
        self.img_shape = (self.img_rows, self.img_cols, self.channels)
        self.input_dim = 100
        self.latent_dim = 100
        self.n_outputs = 2
        self.n_points = 50

        self.discriminator = self.define_discriminator()
        self.generator = self.define_generator()
        self.gan = self.define_gan()

    def define_discriminator(self):
        model = Sequential()
        model.add(Dense(256, activation='relu', kernel_initializer='he_uniform', input_dim=self.input_dim))
        model.add(Dropout(0.3))
        model.add(Dense(128, activation='relu'))
        model.add(Dropout(0.3))
        model.add(Dense(1, activation='sigmoid'))
        model.compile(loss='binary_crossentropy', optimizer='adam', metrics=['accuracy'])
        return model

    def define_generator(self):
        model = Sequential()
        model.add(Dense(128, activation='relu', kernel_initializer='he_uniform', input_dim=self.latent_dim))
        model.add(BatchNormalization())
        model.add(Dense(256, activation='relu'))
        model.add(BatchNormalization())
        model.add(Dense(self.n_outputs, activation='linear'))
        return model

    def define_gan(self):
        self.discriminator.trainable = False
        model = Sequential()
        model.add(self.generator)
        model.add(self.discriminator)
        model.compile(loss='binary_crossentropy', optimizer='adam')
        return model

    def generate_latent_points(self):
        x_input = randn(self.latent_dim * self.n_points)
        x_input = x_input.reshape(self.n_points, self.latent_dim)
        return x_input

    def generate_fake_samples(self):
        x_input = self.generator.generate_latent_points(self.latent_dim, self.n)
        X = self.generator.predict(x_input)
        y = zeros((self.n, 1))
        return X, y

    def get_real_samples(df, batch):
        real = df.sample(int(df.shape[0] / batch))
        X = real.drop(['Time', 'Class'], axis=1).values
        y = ones(X.shape[0])
        return X, y

    def train(self):
        pass


if __name__ == '__main__':
    gan = GAN()
    gan.train()
